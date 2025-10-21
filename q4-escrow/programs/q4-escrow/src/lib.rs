use anchor_lang::prelude::*;

declare_id!("6ymMQ8T2WxJ4ukkeQ78g6KNgH8DgcEJ8zd7RW5MT2kza");

#[program]
pub mod q4_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
