use anchor_lang::prelude::*;

use crate::{error::MPLXCoreError, state::WhitelistedCreators};

#[derive(Accounts)] 
pub struct WhitelistCreator<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK should be a keypair
    pub creator: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = WhitelistedCreators::DISCRIMINATOR.len() + WhitelistedCreators::INIT_SPACE,
        seeds = [b"whitelist"],
        bump,
    )]
    pub whitelisted_creators: Account<'info, WhitelistedCreators>,
    pub system_program: Program<'info, System>,
}

impl<'info> WhitelistCreator<'info> {
    pub fn whitelist_creator(&mut self) -> Result<()> {
        self.whitelisted_creators.whitelist_creator(&self.creator)
    }
}