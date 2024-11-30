use anchor_lang::prelude::*;

#[event]
pub struct StockClassCreated {
    pub id: [u8; 16],
    pub class_type: String,
    pub price_per_share: u64,
    pub initial_shares_authorized: u64,
}

#[event]
pub struct StockClassSharesAdjusted {
    pub stock_class_id: [u8; 16],
    pub new_shares_authorized: u64,
}

#[event]
pub struct StakeholderCreated {
    pub id: [u8; 16],
}

#[event]
pub struct StockIssued {
    pub stock_class_id: [u8; 16],
    pub security_id: [u8; 16],
    pub stakeholder_id: [u8; 16],
    pub quantity: u64,
    pub share_price: u64,
}

#[event]
pub struct StockPlanCreated {
    pub id: [u8; 16],
    pub shares_reserved: u64,
}

#[event]
pub struct StockPlanSharesAdjusted {
    pub id: [u8; 16],
    pub new_shares_reserved: u64,
}
