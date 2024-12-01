use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("FejBZZZmyTeqxBLEkbBHiAiHWov7MnTUznNjmi4TyRXR");

#[program]
pub mod ocp_solana {
    use super::*;

    pub fn initialize_issuer(
        ctx: Context<InitializeIssuer>,
        id: [u8; 16],
        initial_shares_authorized: u64,
    ) -> Result<()> {
        instructions::issuer::initialize_issuer(ctx, id, initial_shares_authorized)
    }

    pub fn adjust_authorized_shares(
        ctx: Context<AdjustAuthorizedShares>,
        new_shares_authorized: u64,
    ) -> Result<()> {
        instructions::issuer::adjust_authorized_shares(ctx, new_shares_authorized)
    }

    pub fn create_stock_class(
        ctx: Context<CreateStockClass>,
        id: [u8; 16],
        class_type: String,
        price_per_share: u64,
        initial_shares_authorized: u64,
    ) -> Result<()> {
        instructions::stock_class::create_stock_class(
            ctx,
            id,
            class_type,
            price_per_share,
            initial_shares_authorized,
        )
    }

    pub fn adjust_stock_class_shares(
        ctx: Context<AdjustStockClassShares>,
        new_shares_authorized: u64,
    ) -> Result<()> {
        instructions::stock_class::adjust_stock_class_shares(ctx, new_shares_authorized)
    }

    pub fn create_stakeholder(ctx: Context<CreateStakeholder>, id: [u8; 16]) -> Result<()> {
        instructions::stakeholder::create_stakeholder(ctx, id)
    }

    pub fn issue_stock(
        ctx: Context<IssueStock>,
        security_id: [u8; 16],
        quantity: u64,
        share_price: u64,
    ) -> Result<()> {
        instructions::stock::issue_stock(ctx, security_id, quantity, share_price)
    }

    pub fn create_stock_plan(
        ctx: Context<CreateStockPlan>,
        id: [u8; 16],
        stock_class_ids: Vec<[u8; 16]>,
        shares_reserved: u64,
    ) -> Result<()> {
        instructions::stock_plan::create_stock_plan(ctx, id, stock_class_ids, shares_reserved)
    }

    pub fn adjust_stock_plan_shares(
        ctx: Context<AdjustStockPlanShares>,
        new_shares_reserved: u64,
    ) -> Result<()> {
        instructions::stock_plan::adjust_stock_plan_shares(ctx, new_shares_reserved)
    }

    pub fn issue_convertible(
        ctx: Context<IssueConvertible>,
        security_id: [u8; 16],
        investment_amount: u64,
    ) -> Result<()> {
        instructions::convertible::issue_convertible(ctx, security_id, investment_amount)
    }

    pub fn issue_equity_compensation(
        ctx: Context<IssueEquityCompensation>,
        security_id: [u8; 16],
        quantity: u64,
    ) -> Result<()> {
        instructions::equity_compensation::issue_equity_compensation(ctx, security_id, quantity)
    }

    pub fn exercise_equity_compensation(
        ctx: Context<ExerciseEquityCompensation>,
        quantity: u64,
    ) -> Result<()> {
        instructions::equity_compensation::exercise_equity_compensation(ctx, quantity)
    }

    pub fn issue_warrant(
        ctx: Context<IssueWarrant>,
        security_id: [u8; 16],
        quantity: u64,
    ) -> Result<()> {
        instructions::warrant::issue_warrant(ctx, security_id, quantity)
    }
}
