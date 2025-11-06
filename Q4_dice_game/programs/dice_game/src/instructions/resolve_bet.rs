use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use solana_program::{
    sysvar::instructions::{load_instruction_at_checked, ID as IX_ID},
    ed25519_program,
    instruction::Instruction,
};

use crate::{errors::DiceError, state::Bet};

#[derive(Accounts)]
pub struct ResolveBet<'info> {
    /// CHECK: This is safe - house pubkey for signature verification
    pub house: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub player: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", house.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(
        mut,
        close = player,
        seeds = [b"bet", vault.key().as_ref(), bet.seed.to_le_bytes().as_ref()],
        bump = bet.bump,
        constraint = bet.player == player.key() @ DiceError::Ed25519Accounts
    )]
    pub bet: Account<'info, Bet>,
    
    /// CHECK: This is the instructions sysvar
    #[account(address = IX_ID)]
    pub instruction_sysvar: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> ResolveBet<'info> {
    pub fn verify_ed25519_signature(&mut self, sig: &[u8]) -> Result<()> {
        // Load the Ed25519 instruction from the instruction sysvar
        let ix: Instruction = load_instruction_at_checked(0, &self.instruction_sysvar)?;
        
        // Verify it's the Ed25519 program
        require_keys_eq!(
            ix.program_id,
            ed25519_program::ID,
            DiceError::Ed25519Program
        );
        
        // Verify the instruction has the correct number of accounts (0 for ed25519)
        require_eq!(
            ix.accounts.len(),
            0,
            DiceError::Ed25519Accounts
        );
        
        // Ed25519 instruction data format:
        // [0] = number of signatures (u8)
        // [1] = padding (u8)
        // [2..4] = signature_offset (u16, little-endian)
        // [4..6] = signature_instruction_index (u16)
        // [6..8] = public_key_offset (u16, little-endian)
        // [8..10] = public_key_instruction_index (u16)
        // [10..12] = message_offset (u16, little-endian)
        // [12..14] = message_size (u16, little-endian)
        // [14..16] = message_instruction_index (u16)
        // Then data at specified offsets
        
        require_gte!(
            ix.data.len(),
            16, // Minimum header size
            DiceError::Ed25519DataLength
        );
        
        // Verify header (num_signatures should be 1)
        require_eq!(
            ix.data[0],
            1,
            DiceError::Ed25519Header
        );
        
        // Extract offsets from the instruction
        let signature_offset = u16::from_le_bytes([ix.data[2], ix.data[3]]) as usize;
        let pubkey_offset = u16::from_le_bytes([ix.data[6], ix.data[7]]) as usize;
        let message_offset = u16::from_le_bytes([ix.data[10], ix.data[11]]) as usize;
        let message_length = u16::from_le_bytes([ix.data[12], ix.data[13]]) as usize;
        
        // Verify offsets are valid
        require!(
            signature_offset + 64 <= ix.data.len(),
            DiceError::Ed25519Signature
        );
        require!(
            pubkey_offset + 32 <= ix.data.len(),
            DiceError::Ed25519Pubkey
        );
        require!(
            message_offset + message_length <= ix.data.len(),
            DiceError::Ed25519DataLength
        );
        
        // Extract and verify the public key (should be house pubkey)
        let pubkey_bytes = &ix.data[pubkey_offset..pubkey_offset + 32];
        require!(
            pubkey_bytes == self.house.key().to_bytes(),
            DiceError::Ed25519Pubkey
        );
        
        // Extract and verify the signature
        let signature_bytes = &ix.data[signature_offset..signature_offset + 64];
        require_eq!(
            signature_bytes.len(),
            64,
            DiceError::Ed25519Signature
        );
        
        // Verify the signature matches the provided sig parameter
        require!(
            signature_bytes == sig,
            DiceError::Ed25519Signature
        );
        
        // Extract the message
        let message = &ix.data[message_offset..message_offset + message_length];
        
        // Verify the message matches the bet data
        let bet_data = self.bet.to_slice();
        require!(
            message == bet_data.as_slice(),
            DiceError::Ed25519Message
        );
        
        Ok(())
    }
    
    pub fn resolve_bet(&mut self, sig: &[u8], bumps: &ResolveBetBumps) -> Result<()> {
        // Use the signature to generate a pseudo-random roll (0-99)
        let mut hash_result = [0u8; 32];
        hash_result.copy_from_slice(&sig[..32]);
        
        let roll_result = u16::from_le_bytes([hash_result[0], hash_result[1]]) % 100;
        
        // Player wins if roll_result is less than bet.roll
        let player_wins = roll_result < self.bet.roll as u16;
        
        if player_wins {
            // Calculate payout: amount * (100 / roll) 
            // For example: bet 1 SOL on roll < 50 = 50% chance = 2x payout
            let multiplier = 100u128
                .checked_mul(10000) // Use 10000 for precision (100.00%)
                .ok_or(DiceError::Overflow)?
                .checked_div(self.bet.roll as u128)
                .ok_or(DiceError::Overflow)?;
            
            let payout = (self.bet.amount as u128)
                .checked_mul(multiplier)
                .ok_or(DiceError::Overflow)?
                .checked_div(10000)
                .ok_or(DiceError::Overflow)? as u64;
            
            // Transfer winnings from vault to player
            let accounts = Transfer {
                from: self.vault.to_account_info(),
                to: self.player.to_account_info(),
            };
            
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"vault",
                &self.house.key().to_bytes(),
                &[bumps.vault]
            ]];
            
            let ctx = CpiContext::new_with_signer(
                self.system_program.to_account_info(),
                accounts,
                signer_seeds,
            );
            
            transfer(ctx, payout)?;
        }
        // If player loses, the bet amount stays in the vault (already deposited)
        
        Ok(())
    }
}