use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct StockPosition {
    pub stakeholder_id: [u8; 16],
    pub stock_class_id: [u8; 16],
    pub security_id: [u8; 16],
    pub quantity: u64,
    pub share_price: u64,
} 