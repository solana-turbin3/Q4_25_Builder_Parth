import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  addSignersToTransactionMessage,
  getProgramDerivedAddress,
  generateKeyPairSigner,
  getAddressEncoder,
} from "@solana/kit";
import {
  getInitializeInstruction,
  getSubmitTsInstruction,
} from "./clients/js/src/generated/index";
const MPL_CORE_PROGRAM = address(
  "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
);
const COLLECTION = address("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");
const PROGRAM_ADDRESS = address("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
import wallet from "./Turbin3-wallet.json";
const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
console.log(`Your Solana wallet address: ${keypair.address}`);
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(
  devnet("wss://api.devnet.solana.com")
);
const mintKeyPair = await generateKeyPairSigner();

const addressEncoder = getAddressEncoder();
const enrollaccountSeeds = [
  Buffer.from("prereqs"),
  addressEncoder.encode(keypair.address),
];
const [enrollaccount, _enrollbump] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: enrollaccountSeeds,
});

const authorityaccountSeeds = [
  Buffer.from("collection"),
  addressEncoder.encode(COLLECTION),
];
const [authaccount, _authbump] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: authorityaccountSeeds,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const initializeIx = getInitializeInstruction({
  github: "mega123-art", // Replace with your actual GitHub username
  user: keypair,
  account: enrollaccount,
  systemProgram: SYSTEM_PROGRAM,
});

const transactionMessageInit = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstructions([initializeIx], tx)
);

const signedTxInit = await signTransactionMessageWithSigners(
  transactionMessageInit
);
assertIsTransactionWithinSizeLimit(signedTxInit);

const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

try {
  await sendAndConfirmTransaction(signedTxInit, {
    commitment: "confirmed",
    skipPreflight: false,
  });
  const signatureInit = getSignatureFromTransaction(signedTxInit);
  console.log(
    `Init Success! https://explorer.solana.com/tx/${signatureInit}?cluster=devnet`
  );
} catch (e) {
  console.error(`Init failed: ${e}`);
}

const submitIx = getSubmitTsInstruction({
  user: keypair,
  account: enrollaccount, // Fixed
  mint: mintKeyPair,
  collection: COLLECTION,
  authority: authaccount,
  mplCoreProgram: MPL_CORE_PROGRAM,
  systemProgram: SYSTEM_PROGRAM,
});

const transactionMessageSubmit = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstructions([submitIx], tx),
  (tx) => addSignersToTransactionMessage([mintKeyPair], tx)
);

const signedTxSubmit = await signTransactionMessageWithSigners(
  transactionMessageSubmit
);
assertIsTransactionWithinSizeLimit(signedTxSubmit);

try {
  await sendAndConfirmTransaction(signedTxSubmit, {
    commitment: "confirmed",
    skipPreflight: false,
  });
  const signatureSubmit = getSignatureFromTransaction(signedTxSubmit);
  console.log(
    `Submit Success! https://explorer.solana.com/tx/${signatureSubmit}?cluster=devnet`
  );
} catch (e) {
  console.error(`Submit failed: ${e}`);
}