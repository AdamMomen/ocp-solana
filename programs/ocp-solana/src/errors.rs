use anchor_lang::prelude::*;

#[error_code]
pub enum IssuerError {
    #[msg("Issuer has already been initialized")]
    AlreadyInitialized,
}

#[error_code]
pub enum StockError {
    #[msg("Insufficient shares available for issuance")]
    InsufficientShares,
    #[msg("Quantity must be greater than zero")]
    InvalidQuantity,
    #[msg("Share price must be greater than zero")]
    InvalidSharePrice,
}

#[error_code]
pub enum StockPlanError {
    #[msg("Stock class count must be greater than zero")]
    InvalidStockClassCount,
    #[msg("Stock class count mismatch")]
    StockClassCountMismatch,
    #[msg("Stock class ID mismatch")]
    StockClassIdMismatch,
}