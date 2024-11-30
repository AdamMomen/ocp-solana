use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(security_id: [u8; 16], quantity: u64)]
pub struct IssueWarrant<'info> {
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 16 + 8, // discriminator + stakeholder_id + security_id + quantity
        seeds = [
            b"warrant_position",
            stakeholder.id.as_ref(),
            security_id.as_ref()
        ],
        bump
    )]
    pub position: Account<'info, WarrantActivePosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn issue_warrant(
    ctx: Context<IssueWarrant>,
    security_id: [u8; 16],
    quantity: u64,
) -> Result<()> {
    require!(quantity > 0, WarrantError::InvalidQuantity);

    let position = &mut ctx.accounts.position;
    let stakeholder = &ctx.accounts.stakeholder;

    position.stakeholder_id = stakeholder.id;
    position.security_id = security_id;
    position.quantity = quantity;

    emit!(WarrantIssued {
        stakeholder_id: stakeholder.id,
        security_id,
        quantity,
    });

    Ok(())
}
