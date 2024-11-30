use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(security_id: [u8; 16], investment_amount: u64)]
pub struct IssueConvertible<'info> {
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 16 + 8, // discriminator + stakeholder_id + security_id + investment_amount
        seeds = [
            b"convertible_position",
            stakeholder.id.as_ref(),
            security_id.as_ref()
        ],
        bump
    )]
    pub position: Account<'info, ConvertibleActivePosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn issue_convertible(
    ctx: Context<IssueConvertible>,
    security_id: [u8; 16],
    investment_amount: u64,
) -> Result<()> {
    require!(investment_amount > 0, ConvertibleError::InvalidAmount);

    let position = &mut ctx.accounts.position;
    let stakeholder = &ctx.accounts.stakeholder;

    position.stakeholder_id = stakeholder.id;
    position.security_id = security_id;
    position.investment_amount = investment_amount;

    emit!(ConvertibleIssued {
        stakeholder_id: stakeholder.id,
        security_id,
        investment_amount,
    });

    Ok(())
}
