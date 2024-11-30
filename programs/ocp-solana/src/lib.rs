use anchor_lang::prelude::*;

declare_id!("FejBZZZmyTeqxBLEkbBHiAiHWov7MnTUznNjmi4TyRXR");

#[program]
pub mod ocp_solana {
    use super::*;

    pub fn initialize_issuer(
        ctx: Context<InitializeIssuer>,
        id: [u8; 16],  // bytes16 equivalent
        initial_shares_authorized: u64,
    ) -> Result<()> {
        let issuer = &mut ctx.accounts.issuer;
        
        // Check if already initialized (shares_authorized != 0)
        require!(
            issuer.shares_authorized == 0,
            IssuerError::AlreadyInitialized
        );

        issuer.id = id;
        issuer.shares_issued = 0;
        issuer.shares_authorized = initial_shares_authorized;

        msg!("Issuer initialized with id: {:?}", id);
        Ok(())
    }

    pub fn adjust_authorized_shares(
        ctx: Context<AdjustAuthorizedShares>,
        new_shares_authorized: u64,
    ) -> Result<()> {
        let issuer = &mut ctx.accounts.issuer;
        issuer.shares_authorized = new_shares_authorized;
        
        msg!("Adjusted authorized shares to: {}", new_shares_authorized);
        Ok(())
    }

    pub fn create_stock_class(
        ctx: Context<CreateStockClass>,
        id: [u8; 16],
        class_type: String,
        price_per_share: u64,
        initial_shares_authorized: u64,
    ) -> Result<()> {
        let stock_class = &mut ctx.accounts.stock_class;
        
        stock_class.id = id;
        stock_class.class_type = class_type;
        stock_class.price_per_share = price_per_share;
        stock_class.shares_issued = 0;
        stock_class.shares_authorized = initial_shares_authorized;

        emit!(StockClassCreated {
            id,
            class_type: stock_class.class_type.clone(),
            price_per_share,
            initial_shares_authorized,
        });
        
        Ok(())
    }

    pub fn adjust_stock_class_shares(
        ctx: Context<AdjustStockClassShares>,
        new_shares_authorized: u64,
    ) -> Result<()> {
        let stock_class = &mut ctx.accounts.stock_class;
        stock_class.shares_authorized = new_shares_authorized;

        emit!(StockClassSharesAdjusted {
            stock_class_id: stock_class.id,
            new_shares_authorized,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeIssuer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + // discriminator
                16 + // id
                8 + // shares_issued
                8   // shares_authorized
    )]
    pub issuer: Account<'info, Issuer>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdjustAuthorizedShares<'info> {
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateStockClass<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + // discriminator
                16 + // id
                40 + // class_type string (max length 40)
                8 + // price_per_share
                8 + // shares_issued
                8   // shares_authorized
    )]
    pub stock_class: Account<'info, StockClass>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdjustStockClassShares<'info> {
    #[account(mut)]
    pub stock_class: Account<'info, StockClass>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(Default)]
pub struct Issuer {
    pub id: [u8; 16],              // equivalent to bytes16
    pub shares_issued: u64,        // uint256 equivalent (though smaller range)
    pub shares_authorized: u64,    // uint256 equivalent (though smaller range)
}

#[account]
#[derive(Default)]
pub struct StockClass {
    pub id: [u8; 16],              // bytes16
    pub class_type: String,        // "COMMON" or "PREFERRED"
    pub price_per_share: u64,      
    pub shares_issued: u64,
    pub shares_authorized: u64,
}

// Events
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

#[error_code]
pub enum IssuerError {
    #[msg("Issuer has already been initialized")]
    AlreadyInitialized,
}
