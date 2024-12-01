use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(security_id: [u8; 16], quantity: u64, share_price: u64)]
pub struct IssueStock<'info> {
    #[account(mut)]
    pub stock_class: Account<'info, StockClass>,
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 16 + 16 + 8 + 8,
        seeds = [
            b"stock_position",
            stakeholder.id.as_ref(),
            security_id.as_ref()
        ],
        bump
    )]
    pub position: Account<'info, StockActivePosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn issue_stock(
    ctx: Context<IssueStock>,
    security_id: [u8; 16],
    quantity: u64,
    share_price: u64,
) -> Result<()> {
    require!(quantity > 0, StockError::InvalidQuantity);
    require!(share_price > 0, StockError::InvalidSharePrice);

    let position = &mut ctx.accounts.position;
    let stakeholder = &ctx.accounts.stakeholder;
    let stock_class = &mut ctx.accounts.stock_class;

    require!(
        stock_class.shares_issued + quantity <= stock_class.shares_authorized,
        StockError::InsufficientShares
    );

    position.stakeholder_id = stakeholder.id;
    position.stock_class_id = stock_class.id;
    position.security_id = security_id;
    position.quantity = quantity;
    position.share_price = share_price;

    stock_class.shares_issued += quantity;

    // Serialize using the StockIssued event struct
    let tx_data = AnchorSerialize::try_to_vec(
        &(StockIssued {
            stock_class_id: stock_class.id,
            security_id,
            stakeholder_id: stakeholder.id,
            quantity,
            share_price,
        }),
    )?;

    emit!(TxCreated {
        tx_type: TxType::StockIssuance,
        tx_data,
    });

    Ok(())
}
