use anchor_lang::prelude::*;

declare_id!("64dwDBXenrc7rKLJcE1qfswQSf1cimYoLigJURKvQCEG");

#[program]
pub mod q4_amm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
