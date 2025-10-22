use anchor_lang::prelude::*;
mod instructions;
mod state;
mod error;

use instructions::*;
// use state::*;
declare_id!("Ck7AXoSAGnYvp7xViWaKakeRnGHB7YV4gHa1qv3PfyQ3");

#[program]
pub mod q4_nft {
    use super::*;
pub fn whitelist_creator(ctx: Context<WhitelistCreator>) -> Result<()> {
        ctx.accounts.whitelist_creator()
    }
    
    pub fn create_collection(ctx: Context<CreateCollection>, args: CreateCollectionArgs) -> Result<()> {
        ctx.accounts.create_collection(args, &ctx.bumps)
    }

    pub fn mint_nft(ctx: Context<MintNft>) -> Result<()> {
        ctx.accounts.mint_nft()
    }

    pub fn freeze_nft(ctx: Context<FreezeNft>) -> Result<()> {
        ctx.accounts.freeze_nft()
    }

    pub fn thaw_nft(ctx: Context<ThawNft>) -> Result<()> {
        ctx.accounts.thaw_nft()
    }

    pub fn thaw_nft(ctx: Context<UpdateNft>, new_name: String) -> Result<()> {
        ctx.accounts.update_nft(new_name)
    }
}
