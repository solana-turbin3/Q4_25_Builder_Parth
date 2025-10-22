use anchor_lang::prelude::*;

declare_id!("Ck7AXoSAGnYvp7xViWaKakeRnGHB7YV4gHa1qv3PfyQ3");

#[program]
pub mod q4_nft {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
