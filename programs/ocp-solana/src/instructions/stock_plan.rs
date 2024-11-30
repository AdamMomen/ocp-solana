use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(id: [u8; 16], stock_class_ids: Vec<[u8; 16]>)]
pub struct CreateStockPlan<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(
        init,
        payer = authority,
        space = 8 + // discriminator
                16 + // id
                4 + (16 * 32) + // Vec<[u8; 16]> (space for up to 32 stock classes)
                8, // shares_reserved
        seeds = [
            b"stock_plan",
            id.as_ref(),
        ],
        bump
    )]
    pub stock_plan: Account<'info, StockPlan>,
    pub stock_class: Account<'info, StockClass>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdjustStockPlanShares<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(mut)]
    pub stock_plan: Account<'info, StockPlan>,
    pub authority: Signer<'info>,
}

pub fn create_stock_plan(
    ctx: Context<CreateStockPlan>,
    id: [u8; 16],
    stock_class_ids: Vec<[u8; 16]>,
    shares_reserved: u64,
) -> Result<()> {
    let stock_plan = &mut ctx.accounts.stock_plan;
    require!(
        stock_class_ids.len() > 0,
        StockPlanError::InvalidStockClassCount
    );

    stock_plan.id = id;
    stock_plan.stock_class_ids = stock_class_ids;
    stock_plan.shares_reserved = shares_reserved;

    emit!(StockPlanCreated {
        id,
        shares_reserved,
    });

    Ok(())
}

pub fn adjust_stock_plan_shares(
    ctx: Context<AdjustStockPlanShares>,
    new_shares_reserved: u64,
) -> Result<()> {
    let stock_plan = &mut ctx.accounts.stock_plan;
    stock_plan.shares_reserved = new_shares_reserved;

    emit!(StockPlanSharesAdjusted {
        id: stock_plan.id,
        new_shares_reserved,
    });

    Ok(())
}
