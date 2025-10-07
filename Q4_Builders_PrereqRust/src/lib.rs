use std::io::{self, BufRead};
use solana_client::rpc_client::RpcClient;
use solana_system_interface::instruction::transfer; 

use std::str::FromStr; 
use solana_sdk::{signature::read_keypair_file, signer::Signer};

 #[cfg(test)] 
mod tests { 
        use solana_sdk::signer;
        use solana_sdk::{ 
hash::hash, 
pubkey::Pubkey, 
message::Message,


transaction::Transaction, 
}; 
use solana_sdk::signature::{Keypair, Signer};
use bs58;  
use std::io::{self, BufRead};
use std::str::FromStr; 
use solana_client::rpc_client::RpcClient; 
use solana_sdk::{ 
signature::{ read_keypair_file}, 
};
 use solana_system_interface::{program as system_program, 
instruction::transfer}; 
use solana_sdk::instruction::{Instruction,AccountMeta}; 
 const RPC_URL: &str = 
"https://api.devnet.solana.com";

#[test]
fn submit(){

let rpc_client = RpcClient::new(RPC_URL);
 let keypair = read_keypair_file("main_wallet.json").expect("Couldn't find 
wallet file"); 

let pubkey = solana_sdk::signer::Signer::pubkey(&keypair);
 let mint = Keypair::new(); 
let turbin3_prereq_program = 
Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap(); 
let collection = 
Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap(); 
let mpl_core_program = 
Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap(); 
let system_program = system_program::id(); 
 let signer_pubkey = keypair.pubkey(); 
let seeds = &[b"prereqs", signer_pubkey.as_ref()]; 
let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, 
&turbin3_prereq_program);
let authority_seeds = &[b"collection", collection.as_ref()];
let (authority, _auth_bump) = Pubkey::find_program_address(authority_seeds, &turbin3_prereq_program);
 let data = vec![77, 124, 82, 163, 21, 133, 181, 206]; 
 let accounts = vec![ 
AccountMeta::new(keypair.pubkey(), true),      
AccountMeta::new(prereq_pda, false),          
AccountMeta::new(mint.pubkey(), true),        
AccountMeta::new(collection, false),          
AccountMeta::new_readonly(authority, false), 
AccountMeta::new_readonly(mpl_core_program, false), // mpl core program 
AccountMeta::new_readonly(system_program, false),   // system program       
]; 
 let blockhash = rpc_client 
.get_latest_blockhash() 
.expect("Failed to get recent blockhash");

 let instruction = Instruction { 
program_id: turbin3_prereq_program, 
accounts, 
data, 
}; 

let transaction = Transaction::new_signed_with_payer( 
&[instruction], 
Some(&keypair.pubkey()), 
&[&keypair, &mint], 
blockhash, 
);

 let signature = rpc_client 
.send_and_confirm_transaction(&transaction) 
.expect("Failed to send transaction"); 
println!( 
"Success! Check out your TX 
here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet", 
signature 
); 

}

#[test] 
fn keygen() {
    let kp = Keypair::new();  
println!("You've generated a new Solana wallet: {}\n", kp.pubkey()); 
println!("To save your wallet, copy and paste the following into a 
JSON file:");  
println!("{:?}", kp.to_bytes());
} 
#[test] 
fn claim_airdrop() {
let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find 
wallet file"); 

let client = RpcClient::new(RPC_URL); 
match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) { 
Ok(sig) => { 
println!("Success! Check your TX here:"); 
println!("https://explorer.solana.com/tx/{}?cluster=devnet", 
sig); 
} 
Err(err) => { 
println!("Airdrop failed: {}", err); 
} 
} 
}


} 
#[test] 
fn transfer_sol() {
    use solana_sdk::{ 
hash::hash, 
pubkey::Pubkey, 
message::Message,


transaction::Transaction, 
}; 
const RPC_URL: &str = 
"https://api.devnet.solana.com";
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find 
wallet file"); 

let pubkey = solana_sdk::signer::Signer::pubkey(&keypair); 
let message_bytes = b"I verify my Solana Keypair!"; 
let sig = solana_sdk::signer::Signer::sign_message(&keypair, message_bytes); 
let sig_hashed = hash(sig.as_ref());
 // Verify the signature using the public key 
match sig.verify(&pubkey.to_bytes(), &sig_hashed.to_bytes()) { 
true => println!("Signature verified"), 
false => println!("Verification failed"), 

}
 let to_pubkey = Pubkey::from_str("BwDi4quaeamgRvcvvv6Sis8LsiuxkWX2HWxtMMJZLcjf").unwrap(); 

let rpc_client = RpcClient::new(RPC_URL); 
 let balance = rpc_client 
.get_balance(&keypair.pubkey()) 
.expect("Failed to get balance");
 let recent_blockhash = rpc_client 
.get_latest_blockhash() 
.expect("Failed to get recent blockhash"); 
 let message = Message::new_with_blockhash( 
&[transfer(&keypair.pubkey(), &to_pubkey, balance)], 
Some(&keypair.pubkey()), 
&recent_blockhash, 
); 
 let fee = rpc_client 
.get_fee_for_message(&message) 
.expect("Failed to get fee calculator"); 
 let transaction = Transaction::new_signed_with_payer( 
&[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)], 
Some(&keypair.pubkey()), 
&vec![&keypair], 
recent_blockhash, 
); 


 let signature = rpc_client 
.send_and_confirm_transaction(&transaction) 
.expect("Failed to send transaction"); 
println!( 
"Success! Check out your TX here: 
https://explorer.solana.com/tx/{}/?cluster=devnet", 
signature 
);
} 

#[test]
fn base58_to_wallet() { 
println!("Input your private key as a base58 string:"); 
let stdin = io::stdin(); 
let base58 = stdin.lock().lines().next().unwrap().unwrap(); 
println!("Your wallet file format is:"); 
let wallet = bs58::decode(base58).into_vec().unwrap(); 
println!("{:?}", wallet); 
} 
 #[test] 
fn wallet_to_base58() { 
println!("Input your private key as a JSON byte array (e.g. 
[12,34,...]):"); 
let stdin = io::stdin(); 
let wallet = stdin 
.lock() 
.lines() 
.next() 
.unwrap() 
.unwrap() 
.trim_start_matches('[') 
.trim_end_matches(']') 
.split(',') 
.map(|s| s.trim().parse::<u8>().unwrap()) 
.collect::<Vec<u8>>(); 
println!("Your Base58-encoded private key is:"); 
let base58 = bs58::encode(wallet).into_string(); 
println!("{:?}", base58); 
}