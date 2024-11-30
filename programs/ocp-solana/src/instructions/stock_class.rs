use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct CreateStockClass<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 40 + 8 + 8 + 8,
        seeds = [
            b"stock_class",
            id.as_ref(),
        ],
        bump
    )]
    pub stock_class: Account<'info, StockClass>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdjustStockClassShares<'info> {
    pub issuer: Account<'info, Issuer>,
    #[account(mut)]
    pub stock_class: Account<'info, StockClass>,
    pub authority: Signer<'info>,
}

pub fn create_stock_class(
    ctx: Context<CreateStockClass>,
    id: [u8; 16],
    class_type: String,
    price_per_share: u64,
    initial_shares_authorized: u64,
) -> Result<()> {
    let stock_class = &mut ctx.accounts.stock_class;

    stock_class.id = id;
    stock_class.class_type = class_type;
    stock_class.price_per_share = price_per_share;
    stock_class.shares_issued = 0;
    stock_class.shares_authorized = initial_shares_authorized;

    emit!(StockClassCreated {
        id,
        class_type: stock_class.class_type.clone(),
        price_per_share,
        initial_shares_authorized,
    });

    Ok(())
}

pub fn adjust_stock_class_shares(
    ctx: Context<AdjustStockClassShares>,
    new_shares_authorized: u64,
) -> Result<()> {
    let stock_class = &mut ctx.accounts.stock_class;
    stock_class.shares_authorized = new_shares_authorized;

    emit!(StockClassSharesAdjusted {
        stock_class_id: stock_class.id,
        new_shares_authorized,
    });

    Ok(())
}
