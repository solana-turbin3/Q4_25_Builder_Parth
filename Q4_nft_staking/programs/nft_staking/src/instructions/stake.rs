use anchor_lang::prelude::*;
use mpl_core::{
    instructions::AddPluginV1CpiBuilder,
    types::{FreezeDelegate, Plugin, PluginAuthority},
    ID as CORE_PROGRAM_ID,
};

use crate::{
    errors::StakeError,
    state::{StakeAccount, StakeConfig, UserAccount},
};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = asset.owner == &CORE_PROGRAM_ID @ StakeError::InvalidAsset,
        constraint = !asset.data_is_empty() @ StakeError::AssetNotInitialized
    )]
    pub asset: UncheckedAccount<'info>,

    #[account(mut)]
    pub collection: UncheckedAccount<'info>,

    #[account(
        seeds = [b"config".as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StakeConfig>,

    #[account(
        mut,
        seeds = [b"user".as_ref(), user.key().as_ref()],
        bump = user_account.bump,
        constraint = user_account.amount_staked < config.max_stake @ StakeError::MaxStakeReached
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = user,
        space = StakeAccount::DISCRIMINATOR.len() + StakeAccount::INIT_SPACE,
        seeds = [b"stake".as_ref(), config.key().as_ref(), asset.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(address = CORE_PROGRAM_ID)]
    pub core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Stake<'info> {
    pub fn stake(&mut self, bumps: &StakeBumps) -> Result<()> {
        self.stake_account.set_inner(StakeAccount {
            owner: self.user.key(),
            mint: self.asset.key(),
            staked_at: Clock::get()?.unix_timestamp,
            bump: bumps.stake_account,
        });

        self.user_account.amount_staked = self
            .user_account
            .amount_staked
            .checked_add(1)
            .ok_or(StakeError::MaxStakeReached)?;

        AddPluginV1CpiBuilder::new(&self.core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(Some(&self.user.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin(Plugin::FreezeDelegate(FreezeDelegate { frozen: true }))
            .init_authority(PluginAuthority::Owner)
            .invoke()?;

        Ok(())
    }
}