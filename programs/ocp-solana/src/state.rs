use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Issuer {
    pub id: [u8; 16],
    pub shares_issued: u64,
    pub shares_authorized: u64,
}

#[account]
#[derive(Default)]
pub struct StockClass {
    pub id: [u8; 16],
    pub class_type: String,
    pub price_per_share: u64,
    pub shares_issued: u64,
    pub shares_authorized: u64,
}

#[account]
#[derive(Default)]
pub struct StockActivePosition {
    pub stakeholder_id: [u8; 16],
    pub stock_class_id: [u8; 16],
    pub security_id: [u8; 16],
    pub quantity: u64,
    pub share_price: u64,
}

#[account]
#[derive(Default)]
pub struct Stakeholder {
    pub id: [u8; 16],
}

#[account]
#[derive(Default)]
pub struct StockPlan {
    pub id: [u8; 16],
    pub stock_class_ids: Vec<[u8; 16]>,
    pub shares_reserved: u64,
}
