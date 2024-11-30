use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct StockClass {
    pub id: [u8; 16],
    pub class_type: String,
    pub price_per_share: u64,      
    pub shares_issued: u64,
    pub shares_authorized: u64,
} 