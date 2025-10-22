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

describe("q4_amm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Q4Amm as Program<Q4Amm>;

  const initializer = provider.wallet.publicKey;
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();

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

  const seed = new anchor.BN(12345);
  let configPda: anchor.web3.PublicKey;
  let configBump: number;
  let lpBump: number;
  let vaultX: anchor.web3.PublicKey;
  let vaultY: anchor.web3.PublicKey;

  const fee = 30; // 0.3% fee in basis points
  const initialMintAmount = 1_000_000;

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
  });

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

    const depositAmountX = 100_000;
    const depositAmountY = 100_000;
    const lpAmount = 100_000; // For first deposit, LP = sqrt(x * y)

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
    user1AtaLp = getAssociatedTokenAddressSync(mintLp, user1.publicKey, false);

    const depositAmountX = 50_000;
    const depositAmountY = 50_000;
    const lpAmount = 50_000;

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
    const minAmountY = 9_000; // Allow some slippage

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

    // Verify user2 received Y tokens
    const user2BalanceY = (
      await provider.connection.getTokenAccountBalance(user2AtaY)
    ).value.uiAmount;
    expect(user2BalanceY).to.be.greaterThan(initialMintAmount / 1_000_000 - 1);
  });

  it("User2 swaps Y for X", async () => {
    const swapAmountY = 5_000;
    const minAmountX = 4_500; // Allow some slippage

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

  it("User1 withdraws liquidity", async () => {
    const lpBalance = (
      await provider.connection.getTokenAccountBalance(user1AtaLp)
    ).value.amount;

    const withdrawAmount = Number(lpBalance) / 2; // Withdraw half
    const minX = 10_000;
    const minY = 10_000;

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
    expect(Number(lpBalanceAfter)).to.equal(Number(lpBalance) - withdrawAmount);
  });

  it("Initializer withdraws all remaining liquidity", async () => {
    const lpBalance = (
      await provider.connection.getTokenAccountBalance(initializerAtaLp)
    ).value.amount;

    await program.methods
      .withdraw(new anchor.BN(lpBalance), new anchor.BN(1), new anchor.BN(1))
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

    // Verify LP tokens were burned
    const lpBalanceAfter = (
      await provider.connection.getTokenAccountBalance(initializerAtaLp)
    ).value.amount;
    expect(Number(lpBalanceAfter)).to.equal(0);
  });

  it("Fails swap with slippage exceeded", async () => {
    // First deposit some liquidity back
    await program.methods
      .deposit(
        new anchor.BN(50_000),
        new anchor.BN(50_000),
        new anchor.BN(50_000)
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

    // Try swap with unrealistic minimum output
    try {
      await program.methods
        .swap(true, new anchor.BN(10_000), new anchor.BN(100_000)) // Impossible minimum
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
});
