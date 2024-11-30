use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct InitializeIssuer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 8 + 8,
        seeds = [
            b"issuer",
            id.as_ref(),
        ],
        bump
    )]
    pub issuer: Account<'info, Issuer>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdjustAuthorizedShares<'info> {
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    pub authority: Signer<'info>,
}

pub fn initialize_issuer(
    ctx: Context<InitializeIssuer>,
    id: [u8; 16],
    initial_shares_authorized: u64,
) -> Result<()> {
    let issuer = &mut ctx.accounts.issuer;
    
    require!(
        issuer.shares_authorized == 0,
        IssuerError::AlreadyInitialized
    );

    issuer.id = id;
    issuer.shares_issued = 0;
    issuer.shares_authorized = initial_shares_authorized;

    msg!("Issuer initialized with id: {:?}", id);
    Ok(())
}

pub fn adjust_authorized_shares(
    ctx: Context<AdjustAuthorizedShares>,
    new_shares_authorized: u64,
) -> Result<()> {
    let issuer = &mut ctx.accounts.issuer;
    issuer.shares_authorized = new_shares_authorized;
    
    msg!("Adjusted authorized shares to: {}", new_shares_authorized);
    Ok(())
} 