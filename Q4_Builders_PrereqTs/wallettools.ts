import bs58 from "bs58";
import promptSync from "prompt-sync";

const prompt = promptSync();

function base58ToBytes() {
  const input = prompt("Enter base58: ");
  if (!input) return;

  try {
    const bytes = bs58.decode(input);
    console.log(JSON.stringify([...bytes]));
  } catch {
    console.log("Invalid base58");
  }
}

function bytesToBase58() {
  const input = prompt("Enter bytes: ");
  if (!input) return;

  try {
    const arr = JSON.parse(input);
    const bytes = Uint8Array.from(arr);
    console.log(bs58.encode(bytes));
  } catch {
    console.log("Invalid array");
  }
}

function main() {
  console.log("1. Base58 to Bytes");
  console.log("2. Bytes to Base58");

  const choice = prompt("Choice: ");

  if (choice === "1") base58ToBytes();
  else if (choice === "2") bytesToBase58();
  else return;

  const again = prompt("Again? y/n: ");
  if (again === "y") main();
}

main();
