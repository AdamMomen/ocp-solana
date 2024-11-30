use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Issuer {
    pub id: [u8; 16],
    pub shares_issued: u64,
    pub shares_authorized: u64,
} 