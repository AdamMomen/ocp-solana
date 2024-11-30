use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Stakeholder {
    pub id: [u8; 16],
}
