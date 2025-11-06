use anchor_lang::prelude::*;

declare_id!("CLjPXP8y9GLCdzzQvCNQ3V895rndMXqthpNi7xpscNRu");

#[program]
pub mod nft_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
