use anchor_lang::prelude::*;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;
declare_id!("6ymMQ8T2WxJ4ukkeQ78g6KNgH8DgcEJ8zd7RW5MT2kza");

#[program]
pub mod q4_escrow {
    use super::*;
pub fn make(ctx: Context<Make>, seed: u64, deposit: u64, receive: u64) -> Result<()> {
        ctx.accounts.deposit(deposit)?;
        ctx.accounts.init_escrow(seed, receive, &ctx.bumps)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }

    // pub fn take(ctx: Context<Take>) -> Result<()> {
    //     ctx.accounts.deposit()?;
    //     ctx.accounts.withdraw_and_close_vault()
    // }
}


