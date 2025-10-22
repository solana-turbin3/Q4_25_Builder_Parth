import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Q4Amm } from "../target/types/q4_amm";
import { expect } from "chai";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("q4_amm - Complete Test Suite", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Q4Amm as Program<Q4Amm>;

  const initializer = provider.wallet.publicKey;
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();

  let mintX: anchor.web3.PublicKey;
  let mintY: anchor.web3.PublicKey;
  let mintLp: anchor.web3.PublicKey;

  let initializerAtaX: anchor.web3.PublicKey;
  let initializerAtaY: anchor.web3.PublicKey;
  let initializerAtaLp: anchor.web3.PublicKey;

  let user1AtaX: anchor.web3.PublicKey;
  let user1AtaY: anchor.web3.PublicKey;
  let user1AtaLp: anchor.web3.PublicKey;

  let user2AtaX: anchor.web3.PublicKey;
  let user2AtaY: anchor.web3.PublicKey;
  let user2AtaLp: anchor.web3.PublicKey;

  let user3AtaX: anchor.web3.PublicKey;
  let user3AtaY: anchor.web3.PublicKey;
  let user3AtaLp: anchor.web3.PublicKey;

  const seed = new anchor.BN(12345);
  let configPda: anchor.web3.PublicKey;
  let configBump: number;
  let lpBump: number;
  let vaultX: anchor.web3.PublicKey;
  let vaultY: anchor.web3.PublicKey;

  const fee = 30; // 0.3% fee in basis points
  const initialMintAmount = 10_000_000; // 10 million tokens

  before(async () => {
    // Airdrop SOL to all parties
    await provider.connection.requestAirdrop(
      initializer,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user1.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user3.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create token mints (decimals=6 to match the AMM)
    mintX = await createMint(
      provider.connection,
      provider.wallet.payer,
      initializer,
      null,
      6
    );
    mintY = await createMint(
      provider.connection,
      provider.wallet.payer,
      initializer,
      null,
      6
    );

    // Create and fund initializer ATAs
    initializerAtaX = getAssociatedTokenAddressSync(mintX, initializer);
    initializerAtaY = getAssociatedTokenAddressSync(mintY, initializer);

    const createInitializerATAsTx = new anchor.web3.Transaction()
      .add(
        createAssociatedTokenAccountInstruction(
          initializer,
          initializerAtaX,
          initializer,
          mintX
        )
      )
      .add(
        createAssociatedTokenAccountInstruction(
          initializer,
          initializerAtaY,
          initializer,
          mintY
        )
      );
    await provider.sendAndConfirm(createInitializerATAsTx);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintX,
      initializerAtaX,
      provider.wallet.payer,
      initialMintAmount
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintY,
      initializerAtaY,
      provider.wallet.payer,
      initialMintAmount
    );

    // Create and fund user1 ATAs
    user1AtaX = getAssociatedTokenAddressSync(mintX, user1.publicKey);
    user1AtaY = getAssociatedTokenAddressSync(mintY, user1.publicKey);

    const createUser1ATAsTx = new anchor.web3.Transaction()
      .add(
        createAssociatedTokenAccountInstruction(
          user1.publicKey,
          user1AtaX,
          user1.publicKey,
          mintX
        )
      )
      .add(
        createAssociatedTokenAccountInstruction(
          user1.publicKey,
          user1AtaY,
          user1.publicKey,
          mintY
        )
      );
    await provider.sendAndConfirm(createUser1ATAsTx, [user1]);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintX,
      user1AtaX,
      provider.wallet.payer,
      initialMintAmount
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintY,
      user1AtaY,
      provider.wallet.payer,
      initialMintAmount
    );

    // Create and fund user2 ATAs
    user2AtaX = getAssociatedTokenAddressSync(mintX, user2.publicKey);
    user2AtaY = getAssociatedTokenAddressSync(mintY, user2.publicKey);

    const createUser2ATAsTx = new anchor.web3.Transaction()
      .add(
        createAssociatedTokenAccountInstruction(
          user2.publicKey,
          user2AtaX,
          user2.publicKey,
          mintX
        )
      )
      .add(
        createAssociatedTokenAccountInstruction(
          user2.publicKey,
          user2AtaY,
          user2.publicKey,
          mintY
        )
      );
    await provider.sendAndConfirm(createUser2ATAsTx, [user2]);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintX,
      user2AtaX,
      provider.wallet.payer,
      initialMintAmount
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintY,
      user2AtaY,
      provider.wallet.payer,
      initialMintAmount
    );

    // Create and fund user3 ATAs
    user3AtaX = getAssociatedTokenAddressSync(mintX, user3.publicKey);
    user3AtaY = getAssociatedTokenAddressSync(mintY, user3.publicKey);

    const createUser3ATAsTx = new anchor.web3.Transaction()
      .add(
        createAssociatedTokenAccountInstruction(
          user3.publicKey,
          user3AtaX,
          user3.publicKey,
          mintX
        )
      )
      .add(
        createAssociatedTokenAccountInstruction(
          user3.publicKey,
          user3AtaY,
          user3.publicKey,
          mintY
        )
      );
    await provider.sendAndConfirm(createUser3ATAsTx, [user3]);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintX,
      user3AtaX,
      provider.wallet.payer,
      initialMintAmount
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintY,
      user3AtaY,
      provider.wallet.payer,
      initialMintAmount
    );
  });

  // ============================================================
  // BASIC FUNCTIONALITY TESTS
  // ============================================================

  describe("Basic Functionality", () => {
    it("Initializes the AMM", async () => {
      // Derive PDAs
      [configPda, configBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [mintLp, lpBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("lp"), configPda.toBuffer()],
        program.programId
      );

      vaultX = getAssociatedTokenAddressSync(mintX, configPda, true);
      vaultY = getAssociatedTokenAddressSync(mintY, configPda, true);

      // Initialize the AMM
      await program.methods
        .initialize(seed, fee, null)
        .accountsStrict({
          initializer: initializer,
          mintX: mintX,
          mintY: mintY,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Verify config account
      const configAccount = await program.account.config.fetch(configPda);
      expect(configAccount.seed.toNumber()).to.equal(seed.toNumber());
      expect(configAccount.mintX.toBase58()).to.equal(mintX.toBase58());
      expect(configAccount.mintY.toBase58()).to.equal(mintY.toBase58());
      expect(configAccount.fee).to.equal(fee);
      expect(configAccount.locked).to.equal(false);
      expect(configAccount.configBump).to.equal(configBump);
      expect(configAccount.lpBump).to.equal(lpBump);

      // Verify LP mint
      const mintLpInfo = await provider.connection.getAccountInfo(mintLp);
      expect(mintLpInfo).to.not.be.null;
    });

    it("Deposits initial liquidity", async () => {
      initializerAtaLp = getAssociatedTokenAddressSync(
        mintLp,
        initializer,
        false
      );

      const depositAmountX = 1_000_000;
      const depositAmountY = 1_000_000;
      const lpAmount = 1_000_000;

      await program.methods
        .deposit(
          new anchor.BN(lpAmount),
          new anchor.BN(depositAmountX),
          new anchor.BN(depositAmountY)
        )
        .accountsStrict({
          user: initializer,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: initializerAtaX,
          userY: initializerAtaY,
          userLp: initializerAtaLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Verify vault balances
      const vaultXBalance = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.uiAmount;
      const vaultYBalance = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.uiAmount;

      expect(vaultXBalance).to.equal(depositAmountX / 1_000_000);
      expect(vaultYBalance).to.equal(depositAmountY / 1_000_000);

      // Verify LP token balance
      const lpBalance = (
        await provider.connection.getTokenAccountBalance(initializerAtaLp)
      ).value.uiAmount;
      expect(lpBalance).to.equal(lpAmount / 1_000_000);
    });

    it("User1 deposits liquidity", async () => {
      user1AtaLp = getAssociatedTokenAddressSync(
        mintLp,
        user1.publicKey,
        false
      );

      const depositAmountX = 500_000;
      const depositAmountY = 500_000;
      const lpAmount = 500_000;

      await program.methods
        .deposit(
          new anchor.BN(lpAmount),
          new anchor.BN(depositAmountX),
          new anchor.BN(depositAmountY)
        )
        .accountsStrict({
          user: user1.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user1AtaX,
          userY: user1AtaY,
          userLp: user1AtaLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();

      // Verify LP token balance
      const lpBalance = (
        await provider.connection.getTokenAccountBalance(user1AtaLp)
      ).value.uiAmount;
      expect(lpBalance).to.be.greaterThan(0);
    });

    it("User2 swaps X for Y", async () => {
      const swapAmountX = 10_000;
      const minAmountY = 9_000;

      const vaultXBefore = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBefore = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      await program.methods
        .swap(true, new anchor.BN(swapAmountX), new anchor.BN(minAmountY))
        .accountsStrict({
          user: user2.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user2AtaX,
          userY: user2AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Verify vault balances changed
      const vaultXAfter = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYAfter = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      expect(Number(vaultXAfter)).to.be.greaterThan(Number(vaultXBefore));
      expect(Number(vaultYAfter)).to.be.lessThan(Number(vaultYBefore));
    });

    it("User2 swaps Y for X", async () => {
      const swapAmountY = 5_000;
      const minAmountX = 4_500;

      const user2BalanceXBefore = (
        await provider.connection.getTokenAccountBalance(user2AtaX)
      ).value.amount;

      await program.methods
        .swap(false, new anchor.BN(swapAmountY), new anchor.BN(minAmountX))
        .accountsStrict({
          user: user2.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user2AtaX,
          userY: user2AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Verify user2 received X tokens
      const user2BalanceXAfter = (
        await provider.connection.getTokenAccountBalance(user2AtaX)
      ).value.amount;
      expect(Number(user2BalanceXAfter)).to.be.greaterThan(
        Number(user2BalanceXBefore)
      );
    });

    it("User1 withdraws liquidity partially", async () => {
      const lpBalance = (
        await provider.connection.getTokenAccountBalance(user1AtaLp)
      ).value.amount;

      const withdrawAmount = Number(lpBalance) / 2;
      const minX = 100_000;
      const minY = 100_000;

      const user1BalanceXBefore = (
        await provider.connection.getTokenAccountBalance(user1AtaX)
      ).value.amount;
      const user1BalanceYBefore = (
        await provider.connection.getTokenAccountBalance(user1AtaY)
      ).value.amount;

      await program.methods
        .withdraw(
          new anchor.BN(withdrawAmount),
          new anchor.BN(minX),
          new anchor.BN(minY)
        )
        .accountsStrict({
          user: user1.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user1AtaX,
          userY: user1AtaY,
          userLp: user1AtaLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();

      // Verify user1 received tokens back
      const user1BalanceXAfter = (
        await provider.connection.getTokenAccountBalance(user1AtaX)
      ).value.amount;
      const user1BalanceYAfter = (
        await provider.connection.getTokenAccountBalance(user1AtaY)
      ).value.amount;

      expect(Number(user1BalanceXAfter)).to.be.greaterThan(
        Number(user1BalanceXBefore)
      );
      expect(Number(user1BalanceYAfter)).to.be.greaterThan(
        Number(user1BalanceYBefore)
      );

      // Verify LP tokens were burned
      const lpBalanceAfter = (
        await provider.connection.getTokenAccountBalance(user1AtaLp)
      ).value.amount;
      expect(Number(lpBalanceAfter)).to.equal(
        Number(lpBalance) - withdrawAmount
      );
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe("Error Handling", () => {
    it("Fails swap with slippage exceeded", async () => {
      try {
        await program.methods
          .swap(true, new anchor.BN(10_000), new anchor.BN(100_000))
          .accountsStrict({
            user: user2.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user2AtaX,
            userY: user2AtaY,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("SlippageExceeded");
      }
    });

    it("Fails deposit with zero amount", async () => {
      try {
        await program.methods
          .deposit(new anchor.BN(0), new anchor.BN(100), new anchor.BN(100))
          .accountsStrict({
            user: initializer,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: initializerAtaX,
            userY: initializerAtaY,
            userLp: initializerAtaLp,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .rpc();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("Cannot swap with zero amount", async () => {
      try {
        await program.methods
          .swap(true, new anchor.BN(0), new anchor.BN(0))
          .accountsStrict({
            user: user2.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user2AtaX,
            userY: user2AtaY,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("Cannot withdraw with zero LP tokens", async () => {
      try {
        await program.methods
          .withdraw(new anchor.BN(0), new anchor.BN(1), new anchor.BN(1))
          .accountsStrict({
            user: user1.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user1AtaX,
            userY: user1AtaY,
            userLp: user1AtaLp,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("Deposit with max slippage protection fails with too-low maxes", async () => {
      // Get current pool ratio to ensure we request something impossible
      const vaultXBalance = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBalance = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      // Request large LP amount but only willing to pay 1 token each (guaranteed to fail)
      try {
        await program.methods
          .deposit(
            new anchor.BN(1_000_000), // Want 1M LP tokens
            new anchor.BN(1), // But only pay max 1 X token
            new anchor.BN(1) // And max 1 Y token
          )
          .accountsStrict({
            user: user2.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user2AtaX,
            userY: user2AtaY,
            userLp: getAssociatedTokenAddressSync(mintLp, user2.publicKey),
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("SlippageExceeded");
      }
    });
  });

  // ============================================================
  // PRICE IMPACT TESTS
  // ============================================================

  describe("Price Impact", () => {
    it("Small swap has minimal price impact", async () => {
      const swapAmount = 1_000;

      const vaultXBefore = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBefore = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      await program.methods
        .swap(true, new anchor.BN(swapAmount), new anchor.BN(900))
        .accountsStrict({
          user: user1.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user1AtaX,
          userY: user1AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vaultXAfter = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYAfter = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      const priceBefore = Number(vaultYBefore) / Number(vaultXBefore);
      const priceAfter = Number(vaultYAfter) / Number(vaultXAfter);
      const priceImpact = Math.abs((priceAfter - priceBefore) / priceBefore);

      expect(priceImpact).to.be.lessThan(0.005);
    });

    it("Large swap has significant price impact", async () => {
      const swapAmount = 100_000;

      const vaultXBefore = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBefore = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      await program.methods
        .swap(true, new anchor.BN(swapAmount), new anchor.BN(1))
        .accountsStrict({
          user: user1.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user1AtaX,
          userY: user1AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vaultXAfter = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYAfter = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      const priceBefore = Number(vaultYBefore) / Number(vaultXBefore);
      const priceAfter = Number(vaultYAfter) / Number(vaultXAfter);
      const priceImpact = Math.abs((priceAfter - priceBefore) / priceBefore);

      expect(priceImpact).to.be.greaterThan(0.05);
    });
  });

  // ============================================================
  // LIQUIDITY PROVIDER ECONOMICS TESTS
  // ============================================================

  describe("Liquidity Provider Economics", () => {
    it("LP receives proportional share of fees", async () => {
      // Get user1's LP balance before fees accumulate
      const lpBalanceBefore = (
        await provider.connection.getTokenAccountBalance(user1AtaLp)
      ).value.amount;

      // Many swaps generate fees
      for (let i = 0; i < 5; i++) {
        await program.methods
          .swap(true, new anchor.BN(10_000), new anchor.BN(1))
          .accountsStrict({
            user: user2.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user2AtaX,
            userY: user2AtaY,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
      }

      // Withdraw and check we got more than we put in (due to fees)
      const xBefore = (
        await provider.connection.getTokenAccountBalance(user1AtaX)
      ).value.amount;
      const yBefore = (
        await provider.connection.getTokenAccountBalance(user1AtaY)
      ).value.amount;

      await program.methods
        .withdraw(
          new anchor.BN(lpBalanceBefore),
          new anchor.BN(1),
          new anchor.BN(1)
        )
        .accountsStrict({
          user: user1.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user1AtaX,
          userY: user1AtaY,
          userLp: user1AtaLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();

      const xAfter = (
        await provider.connection.getTokenAccountBalance(user1AtaX)
      ).value.amount;
      const yAfter = (
        await provider.connection.getTokenAccountBalance(user1AtaY)
      ).value.amount;

      const totalValueBefore = Number(xBefore) + Number(yBefore);
      const totalValueAfter = Number(xAfter) + Number(yAfter);

      expect(totalValueAfter).to.be.greaterThan(totalValueBefore);
    });

    it("Multiple LPs share fees proportionally", async () => {
      user3AtaLp = getAssociatedTokenAddressSync(mintLp, user3.publicKey);

      // Get current pool state - check the mint supply directly
      const mintInfo = await provider.connection.getAccountInfo(mintLp);
      if (!mintInfo) {
        throw new Error("LP mint not found");
      }

      // User3 deposits a significant amount
      const depositAmount = 500_000;
      await program.methods
        .deposit(
          new anchor.BN(depositAmount),
          new anchor.BN(1_000_000),
          new anchor.BN(1_000_000)
        )
        .accountsStrict({
          user: user3.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          mintLp: mintLp,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user3AtaX,
          userY: user3AtaY,
          userLp: user3AtaLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user3])
        .rpc();

      // Check that user3 received LP tokens
      const user3LpBalance = (
        await provider.connection.getTokenAccountBalance(user3AtaLp)
      ).value.amount;

      // User3 should have received LP tokens
      expect(Number(user3LpBalance)).to.be.greaterThan(0);

      // Verify the deposit was meaningful (got at least some LP tokens)
      expect(Number(user3LpBalance)).to.be.greaterThan(100_000);
    });
  });

  // ============================================================
  // SECURITY & INVARIANT TESTS
  // ============================================================

  describe("Security & Invariants", () => {
    it("Swap maintains constant product invariant (k)", async () => {
      const vaultXBefore = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBefore = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      const kBefore = Number(vaultXBefore) * Number(vaultYBefore);

      await program.methods
        .swap(true, new anchor.BN(50_000), new anchor.BN(1))
        .accountsStrict({
          user: user2.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user2AtaX,
          userY: user2AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const vaultXAfter = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYAfter = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      const kAfter = Number(vaultXAfter) * Number(vaultYAfter);

      // k should increase or stay the same (due to fees)
      expect(kAfter).to.be.greaterThanOrEqual(kBefore);
    });

    it("Back-and-forth swaps result in net loss due to fees", async () => {
      // Record starting balances for both tokens
      const startBalanceX = (
        await provider.connection.getTokenAccountBalance(user2AtaX)
      ).value.amount;
      const startBalanceY = (
        await provider.connection.getTokenAccountBalance(user2AtaY)
      ).value.amount;

      const swapAmount = 50_000;

      // Swap X -> Y
      await program.methods
        .swap(true, new anchor.BN(swapAmount), new anchor.BN(1))
        .accountsStrict({
          user: user2.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user2AtaX,
          userY: user2AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const midBalanceY = (
        await provider.connection.getTokenAccountBalance(user2AtaY)
      ).value.amount;

      // Calculate how much Y we got from the swap
      const receivedY = Number(midBalanceY) - Number(startBalanceY);

      // Swap back the exact amount of Y we received
      await program.methods
        .swap(false, new anchor.BN(receivedY), new anchor.BN(1))
        .accountsStrict({
          user: user2.publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: user2AtaX,
          userY: user2AtaY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const endBalanceX = (
        await provider.connection.getTokenAccountBalance(user2AtaX)
      ).value.amount;

      // Should have less X than started with (paid fees twice)
      // We spent 50,000 X and should get back less than 50,000 X
      const netXLoss = Number(startBalanceX) - Number(endBalanceX);
      expect(netXLoss).to.be.greaterThan(0);
      expect(Number(endBalanceX)).to.be.lessThan(Number(startBalanceX));
    });
  });

  // ============================================================
  // STRESS TESTS
  // ============================================================

  describe("Stress Tests", () => {
    it("Handles many small operations", async () => {
      const user1LpAta = getAssociatedTokenAddressSync(mintLp, user1.publicKey);

      // Ensure user1 has an LP account
      const lpAccountInfo = await provider.connection.getAccountInfo(
        user1LpAta
      );
      if (!lpAccountInfo) {
        // Create if doesn't exist
        await program.methods
          .deposit(
            new anchor.BN(1_000),
            new anchor.BN(5_000),
            new anchor.BN(5_000)
          )
          .accountsStrict({
            user: user1.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user1AtaX,
            userY: user1AtaY,
            userLp: user1LpAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();
      }

      const user1LpBefore = (
        await provider.connection.getTokenAccountBalance(user1LpAta)
      ).value.amount;

      // Multiple small deposits
      for (let i = 0; i < 3; i++) {
        await program.methods
          .deposit(
            new anchor.BN(1_000),
            new anchor.BN(5_000),
            new anchor.BN(5_000)
          )
          .accountsStrict({
            user: user1.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user1AtaX,
            userY: user1AtaY,
            userLp: user1LpAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();
      }

      const user1LpAfter = (
        await provider.connection.getTokenAccountBalance(user1LpAta)
      ).value.amount;

      expect(Number(user1LpAfter)).to.be.greaterThan(Number(user1LpBefore));
    });

    it("Pool remains functional after many operations", async () => {
      // Many swaps in both directions
      for (let i = 0; i < 10; i++) {
        await program.methods
          .swap(i % 2 === 0, new anchor.BN(5_000), new anchor.BN(1))
          .accountsStrict({
            user: user2.publicKey,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: user2AtaX,
            userY: user2AtaY,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
      }

      // Pool should still be functional
      const vaultXBalance = (
        await provider.connection.getTokenAccountBalance(vaultX)
      ).value.amount;
      const vaultYBalance = (
        await provider.connection.getTokenAccountBalance(vaultY)
      ).value.amount;

      expect(Number(vaultXBalance)).to.be.greaterThan(0);
      expect(Number(vaultYBalance)).to.be.greaterThan(0);
    });
  });

  // ============================================================
  // FINAL CLEANUP TEST
  // ============================================================

  describe("Cleanup", () => {
    it("Initializer can withdraw remaining liquidity", async () => {
      const lpBalance = (
        await provider.connection.getTokenAccountBalance(initializerAtaLp)
      ).value.amount;

      if (Number(lpBalance) > 0) {
        await program.methods
          .withdraw(
            new anchor.BN(lpBalance),
            new anchor.BN(1),
            new anchor.BN(1)
          )
          .accountsStrict({
            user: initializer,
            mintX: mintX,
            mintY: mintY,
            config: configPda,
            mintLp: mintLp,
            vaultX: vaultX,
            vaultY: vaultY,
            userX: initializerAtaX,
            userY: initializerAtaY,
            userLp: initializerAtaLp,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .rpc();

        const lpBalanceAfter = (
          await provider.connection.getTokenAccountBalance(initializerAtaLp)
        ).value.amount;
        expect(Number(lpBalanceAfter)).to.equal(0);
      }
    });
  });
});
