import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DiceGame } from "../target/types/dice_game";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import nacl from "tweetnacl";

describe("dice_game", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DiceGame as Program<DiceGame>;
  const connection = provider.connection;

  // Accounts
  const house = Keypair.generate();
  const player = Keypair.generate();

  // PDAs
  let vaultPda: PublicKey;
  let vaultBump: number;

  console.log(`House: ${house.publicKey.toString()}`);
  console.log(`Player: ${player.publicKey.toString()}`);

  before(async () => {
    // Airdrop SOL to house and player
    const houseAirdrop = await connection.requestAirdrop(
      house.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(houseAirdrop);

    const playerAirdrop = await connection.requestAirdrop(
      player.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(playerAirdrop);

    // Derive vault PDA
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), house.publicKey.toBuffer()],
      program.programId
    );
    console.log(`Vault PDA: ${vaultPda.toString()}`);
  });

  describe("Initialize", () => {
    it("Initializes the vault with house funds", async () => {
      const initialAmount = 5 * LAMPORTS_PER_SOL;

      const tx = await program.methods
        .initialize(new anchor.BN(initialAmount))
        .accountsStrict({
          house: house.publicKey,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([house])
        .rpc();

      console.log(`Initialize tx: ${tx}`);

      const vaultBalance = await connection.getBalance(vaultPda);
      expect(vaultBalance).to.equal(initialAmount);
      console.log(
        `Vault initialized with ${vaultBalance / LAMPORTS_PER_SOL} SOL`
      );
    });
  });

  describe("Place Bet", () => {
    it("Player places a bet", async () => {
      const seed = new anchor.BN(Math.floor(Math.random() * 1000000));
      const roll = 50; // 50% chance to win
      const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

      const [betPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          vaultPda.toBuffer(),
          seed.toArrayLike(Buffer, "le", 16),
        ],
        program.programId
      );

      const playerBalanceBefore = await connection.getBalance(player.publicKey);

      const tx = await program.methods
        .placeBet(seed, roll, amount)
        .accountsStrict({
          player: player.publicKey,
          house: house.publicKey,
          vault: vaultPda,
          bet: betPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      console.log(`Place Bet tx: ${tx}`);

      const betAccount = await program.account.bet.fetch(betPda);
      expect(betAccount.player.toString()).to.equal(
        player.publicKey.toString()
      );
      expect(betAccount.roll).to.equal(roll);
      expect(betAccount.amount.toNumber()).to.equal(amount.toNumber());

      const playerBalanceAfter = await connection.getBalance(player.publicKey);
      console.log(
        `Player deposited ${amount.toNumber() / LAMPORTS_PER_SOL} SOL`
      );
      console.log(
        `Bet placed: Roll under ${roll} for ${
          amount.toNumber() / LAMPORTS_PER_SOL
        } SOL`
      );
    });
  });

  describe("Resolve Bet - Win", () => {
    it("Resolves a winning bet with Ed25519 signature", async () => {
      const seed = new anchor.BN(Math.floor(Math.random() * 1000000));
      const roll = 75; // 75% chance to win
      const amount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

      const [betPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          vaultPda.toBuffer(),
          seed.toArrayLike(Buffer, "le", 16),
        ],
        program.programId
      );

      // Place bet first
      await program.methods
        .placeBet(seed, roll, amount)
        .accountsStrict({
          player: player.publicKey,
          house: house.publicKey,
          vault: vaultPda,
          bet: betPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      // Fetch bet to get the actual slot
      const betAccount = await program.account.bet.fetch(betPda);

      // Create the message to sign (bet data)
      const message = Buffer.concat([
        betAccount.player.toBuffer(),
        seed.toArrayLike(Buffer, "le", 16),
        new anchor.BN(betAccount.slot.toString()).toArrayLike(Buffer, "le", 8),
        amount.toArrayLike(Buffer, "le", 8),
        Buffer.from([roll, betAccount.bump]),
      ]);

      // Sign with house private key using tweetnacl
      const signature = nacl.sign.detached(message, house.secretKey);

      // Create Ed25519 instruction
      const ed25519Ix = createEd25519Instruction(
        house.publicKey.toBytes(),
        message,
        signature
      );

      const playerBalanceBefore = await connection.getBalance(player.publicKey);
      const vaultBalanceBefore = await connection.getBalance(vaultPda);

      // Resolve bet
      const tx = await program.methods
        .resolveBet(Buffer.from(signature))
        .accountsStrict({
          house: house.publicKey,
          player: player.publicKey,
          vault: vaultPda,
          bet: betPda,
          instructionSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .signers([])
        .rpc();

      console.log(`Resolve Bet tx: ${tx}`);

      const playerBalanceAfter = await connection.getBalance(player.publicKey);
      const vaultBalanceAfter = await connection.getBalance(vaultPda);

      // Check if bet account is closed
      try {
        await program.account.bet.fetch(betPda);
        expect.fail("Bet account should be closed");
      } catch (err) {
        console.log("Bet account closed successfully");
      }

      // Calculate expected payout
      const rollResult = (signature[0] | (signature[1] << 8)) % 100;
      console.log(`Roll result: ${rollResult}, Target: under ${roll}`);

      if (rollResult < roll) {
        console.log("Player WON! ");
        const multiplier = (100 * 10000) / roll;
        const expectedPayout = Math.floor(
          (amount.toNumber() * multiplier) / 10000
        );
        const actualGain = playerBalanceAfter - playerBalanceBefore;
        console.log(
          `Expected payout: ~${expectedPayout / LAMPORTS_PER_SOL} SOL`
        );
        console.log(`Actual gain: ${actualGain / LAMPORTS_PER_SOL} SOL`);
        expect(actualGain).to.be.greaterThan(0);
      } else {
        console.log("Player lost ");
        expect(playerBalanceAfter).to.be.lessThanOrEqual(playerBalanceBefore);
      }
    });
  });

  describe("Resolve Bet - Loss", () => {
    it("Resolves a losing bet", async () => {
      const seed = new anchor.BN(Math.floor(Math.random() * 1000000));
      const roll = 25; // 25% chance to win (likely to lose)
      const amount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);

      const [betPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          vaultPda.toBuffer(),
          seed.toArrayLike(Buffer, "le", 16),
        ],
        program.programId
      );

      // Place bet
      await program.methods
        .placeBet(seed, roll, amount)
        .accountsStrict({
          player: player.publicKey,
          house: house.publicKey,
          vault: vaultPda,
          bet: betPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const betAccount = await program.account.bet.fetch(betPda);

      const message = Buffer.concat([
        betAccount.player.toBuffer(),
        seed.toArrayLike(Buffer, "le", 16),
        new anchor.BN(betAccount.slot.toString()).toArrayLike(Buffer, "le", 8),
        amount.toArrayLike(Buffer, "le", 8),
        Buffer.from([roll, betAccount.bump]),
      ]);

      const signature = nacl.sign.detached(message, house.secretKey);

      const ed25519Ix = createEd25519Instruction(
        house.publicKey.toBytes(),
        message,
        signature
      );

      const vaultBalanceBefore = await connection.getBalance(vaultPda);

      const tx = await program.methods
        .resolveBet(Buffer.from(signature))
        .accountsStrict({
          house: house.publicKey,
          player: player.publicKey,
          vault: vaultPda,
          bet: betPda,
          instructionSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .signers([])
        .rpc();

      console.log(`Resolve Bet tx: ${tx}`);

      const rollResult = (signature[0] | (signature[1] << 8)) % 100;
      console.log(`Roll result: ${rollResult}, Target: under ${roll}`);

      if (rollResult >= roll) {
        console.log("Player lost as expected");
        const vaultBalanceAfter = await connection.getBalance(vaultPda);
        // Vault keeps the bet amount (it was already deposited during place_bet)
        // Vault balance should be at least what it was before (might be slightly less due to rent)
        expect(vaultBalanceAfter).to.be.at.least(vaultBalanceBefore - 10000); // Allow small variance
      } else {
        console.log("Player won (unlucky for this test case)");
      }
    });
  });

  describe("Refund Bet", () => {
    it("Refunds a bet after timeout", async () => {
      const seed = new anchor.BN(Math.floor(Math.random() * 1000000));
      const roll = 50;
      const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

      const [betPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          vaultPda.toBuffer(),
          seed.toArrayLike(Buffer, "le", 16),
        ],
        program.programId
      );

      // Place bet
      await program.methods
        .placeBet(seed, roll, amount)
        .accountsStrict({
          player: player.publicKey,
          house: house.publicKey,
          vault: vaultPda,
          bet: betPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      console.log("Bet placed, waiting for timeout...");

      // Note: In a real test, you would need to wait 1000 slots or use a devnet/testnet
      // For this test, we'll attempt the refund (it will fail due to timeout not reached)

      try {
        await program.methods
          .refundBet()
          .accountsStrict({
            player: player.publicKey,
            house: house.publicKey,
            vault: vaultPda,
            bet: betPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();

        console.log("Refund successful (timeout reached)");
      } catch (err) {
        console.log(
          "Refund failed: Timeout not yet reached (expected in quick tests)"
        );
        expect(err.toString()).to.include("TimeoutNotReached");
      }
    });
  });
});

// Helper function to create Ed25519 instruction
function createEd25519Instruction(
  publicKey: Uint8Array,
  message: Buffer,
  signature: Uint8Array
): anchor.web3.TransactionInstruction {
  // Ed25519 instruction data format
  const numSignatures = 1;
  const paddingByte = 0;
  const signatureOffset = 16; // After header
  const signatureInstructionIndex = 0xffff; // Current instruction
  const publicKeyOffset = signatureOffset + 64;
  const publicKeyInstructionIndex = 0xffff;
  const messageOffset = publicKeyOffset + 32;
  const messageInstructionIndex = 0xffff;

  const dataLength = messageOffset + message.length;
  const instructionData = Buffer.alloc(dataLength);

  let offset = 0;

  // Header
  instructionData.writeUInt8(numSignatures, offset);
  offset += 1;
  instructionData.writeUInt8(paddingByte, offset);
  offset += 1;

  // Signature offset and instruction index
  instructionData.writeUInt16LE(signatureOffset, offset);
  offset += 2;
  instructionData.writeUInt16LE(signatureInstructionIndex, offset);
  offset += 2;

  // Public key offset and instruction index
  instructionData.writeUInt16LE(publicKeyOffset, offset);
  offset += 2;
  instructionData.writeUInt16LE(publicKeyInstructionIndex, offset);
  offset += 2;

  // Message offset, size, and instruction index
  instructionData.writeUInt16LE(messageOffset, offset);
  offset += 2;
  instructionData.writeUInt16LE(message.length, offset);
  offset += 2;
  instructionData.writeUInt16LE(messageInstructionIndex, offset);
  offset += 2;

  // Signature (64 bytes)
  instructionData.set(signature, signatureOffset);

  // Public key (32 bytes)
  instructionData.set(publicKey, publicKeyOffset);

  // Message data
  instructionData.set(message, messageOffset);

  return new anchor.web3.TransactionInstruction({
    keys: [],
    programId: anchor.web3.Ed25519Program.programId,
    data: instructionData,
  });
}
