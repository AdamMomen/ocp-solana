use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(security_id: [u8; 16], stock_class_id: [u8; 16], stock_plan_id: [u8; 16], quantity: u64)]
pub struct IssueEquityCompensation<'info> {
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    pub stakeholder: Account<'info, Stakeholder>,
    pub stock_class: Account<'info, StockClass>,
    pub stock_plan: Account<'info, StockPlan>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 16 + 16 + 16 + 8,
        seeds = [
            b"equity_compensation_position",
            stakeholder.id.as_ref(),
            security_id.as_ref()
        ],
        bump
    )]
    pub position: Account<'info, EquityCompensationActivePosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(equity_comp_security_id: [u8; 16], resulting_stock_security_id: [u8; 16], quantity: u64)]
pub struct ExerciseEquityCompensation<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(mut)]
    pub equity_position: Account<'info, EquityCompensationActivePosition>,
    #[account(mut)]
    pub stock_position: Account<'info, StockActivePosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn issue_equity_compensation(
    ctx: Context<IssueEquityCompensation>,
    security_id: [u8; 16],
    stock_class_id: [u8; 16],
    stock_plan_id: [u8; 16],
    quantity: u64,
) -> Result<()> {
    require!(quantity > 0, EquityCompensationError::InvalidQuantity);

    let position = &mut ctx.accounts.position;
    let stakeholder = &ctx.accounts.stakeholder;

    position.stakeholder_id = stakeholder.id;
    position.stock_class_id = stock_class_id;
    position.stock_plan_id = stock_plan_id;
    position.security_id = security_id;
    position.quantity = quantity;

    // Serialize using the EquityCompensationIssued event struct
    let tx_data = AnchorSerialize::try_to_vec(
        &(EquityCompensationIssued {
            stakeholder_id: stakeholder.id,
            stock_class_id,
            stock_plan_id,
            quantity,
            security_id,
        }),
    )?;

    emit!(TxCreated {
        tx_type: TxType::EquityCompensationIssuance,
        tx_data,
    });

    Ok(())
}

pub fn exercise_equity_compensation(
    ctx: Context<ExerciseEquityCompensation>,
    equity_comp_security_id: [u8; 16],
    resulting_stock_security_id: [u8; 16],
    quantity: u64,
) -> Result<()> {
    let equity_position = &mut ctx.accounts.equity_position;
    let stock_position = &ctx.accounts.stock_position;

    require!(quantity > 0, EquityCompensationError::InvalidQuantity);
    require!(
        equity_position.quantity >= quantity,
        EquityCompensationError::InsufficientShares
    );
    require!(
        stock_position.quantity == quantity,
        EquityCompensationError::QuantityMismatch
    );
    require!(
        stock_position.stakeholder_id == equity_position.stakeholder_id,
        EquityCompensationError::InvalidStakeholder
    );

    // Update equity position
    // use checked_sub to prevent overflow
    equity_position.quantity = equity_position
        .quantity
        .checked_sub(quantity)
        .ok_or(EquityCompensationError::InsufficientShares)?;

    // Serialize using the EquityCompensationExercised event struct
    let tx_data = AnchorSerialize::try_to_vec(
        &(EquityCompensationExercised {
            equity_comp_security_id,
            resulting_stock_security_id,
            quantity,
        }),
    )?;

    emit!(TxCreated {
        tx_type: TxType::EquityCompensationExercise,
        tx_data,
    });

    Ok(())
}
