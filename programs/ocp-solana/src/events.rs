use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TxType {
    Invalid,
    IssuerAuthorizedSharesAdjustment,
    StockClassAuthorizedSharesAdjustment,
    StockAcceptance,
    StockCancellation,
    StockIssuance,
    StockReissuance,
    StockRepurchase,
    StockRetraction,
    StockTransfer,
    ConvertibleIssuance,
    EquityCompensationIssuance,
    StockPlanPoolAdjustment,
    WarrantIssuance,
    EquityCompensationExercise,
}

#[event]
pub struct TxCreated {
    pub tx_type: TxType,
    pub tx_data: Vec<u8>, // Anchor automatically handles serialization
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StockClassCreated {
    pub id: [u8; 16],
    pub class_type: String,
    pub price_per_share: u64,
    pub initial_shares_authorized: u64,
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StockClassSharesAdjusted {
    pub stock_class_id: [u8; 16],
    pub new_shares_authorized: u64,
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StakeholderCreated {
    pub id: [u8; 16],
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StockIssued {
    pub stock_class_id: [u8; 16],
    pub security_id: [u8; 16],
    pub stakeholder_id: [u8; 16],
    pub quantity: u64,
    pub share_price: u64,
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StockPlanCreated {
    pub id: [u8; 16],
    pub shares_reserved: u64,
    pub issuer_id: [u8; 16],
}

#[event]
pub struct StockPlanSharesAdjusted {
    pub id: [u8; 16],
    pub new_shares_reserved: u64,
}

#[event]
pub struct ConvertibleIssued {
    pub stakeholder_id: [u8; 16],
    pub security_id: [u8; 16],
    pub investment_amount: u64,
}

#[event]
pub struct EquityCompensationIssued {
    pub security_id: [u8; 16],
    pub stakeholder_id: [u8; 16],
    pub stock_class_id: [u8; 16],
    pub stock_plan_id: [u8; 16],
    pub quantity: u64,
}

#[event]
pub struct EquityCompensationExercised {
    pub equity_comp_security_id: [u8; 16],
    pub resulting_stock_security_id: [u8; 16],
    pub quantity: u64,
}

#[event]
pub struct WarrantIssued {
    pub stakeholder_id: [u8; 16],
    pub security_id: [u8; 16],
    pub quantity: u64,
}
