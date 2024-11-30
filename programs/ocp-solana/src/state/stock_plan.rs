use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct StockPlan {
    pub id: [u8; 16],
    pub stock_class_ids: Vec<[u8; 16]>,
    pub shares_reserved: u64,
}
