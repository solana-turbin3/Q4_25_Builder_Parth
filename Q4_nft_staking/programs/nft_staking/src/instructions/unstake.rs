use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{RemovePluginV1CpiBuilder, UpdatePluginV1CpiBuilder},
    types::{FreezeDelegate, Plugin, PluginType},
    ID as CORE_PROGRAM_ID,
};

use crate::{
    errors::StakeError,
    state::{StakeAccount, StakeConfig, UserAccount},
};

#[derive(Accounts)]
pub struct Unstake<'info> {
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
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        close = user,
        seeds = [b"stake".as_ref(), config.key().as_ref(), asset.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == user.key() @ StakeError::NotOwner,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(address = CORE_PROGRAM_ID)]
    pub core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Unstake<'info> {
    pub fn unstake(&mut self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let elapsed_time = current_time
            .checked_sub(self.stake_account.staked_at)
            .ok_or(StakeError::FreezePeriodNotPassed)?;

        require!(
            elapsed_time >= self.config.freeze_period as i64,
            StakeError::FreezePeriodNotPassed
        );

        let time_staked = elapsed_time as u32;
        let points_earned = time_staked
            .checked_div(86400) // Convert seconds to days
            .unwrap_or(0)
            .checked_mul(self.config.points_per_stake as u32)
            .unwrap_or(0);

        self.user_account.points = self.user_account.points.checked_add(points_earned).unwrap_or(u32::MAX);
        self.user_account.amount_staked = self
            .user_account
            .amount_staked
            .checked_sub(1)
            .ok_or(StakeError::InvalidAsset)?;

        UpdatePluginV1CpiBuilder::new(&self.core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(Some(&self.user.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin(Plugin::FreezeDelegate(FreezeDelegate { frozen: false }))
            .invoke()?;

        RemovePluginV1CpiBuilder::new(&self.core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(Some(&self.user.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin_type(PluginType::FreezeDelegate)
            .invoke()?;

        Ok(())
    }
}