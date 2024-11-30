use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct CreateStakeholder<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16,
        seeds = [
            b"stakeholder",
            id.as_ref(),
        ],
        bump
    )]
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_stakeholder(ctx: Context<CreateStakeholder>, id: [u8; 16]) -> Result<()> {
    let stakeholder = &mut ctx.accounts.stakeholder;

    // Set the stakeholder ID
    stakeholder.id = id;

    // Emit an event
    emit!(StakeholderCreated { id: stakeholder.id });

    msg!("Stakeholder created with id: {:?}", id);
    Ok(())
}
