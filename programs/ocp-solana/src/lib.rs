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

    pub fn create_stakeholder(
        ctx: Context<CreateStakeholder>,
        id: [u8; 16],  // equivalent to bytes16
    ) -> Result<()> {
        let stakeholder = &mut ctx.accounts.stakeholder;
        
        // Set the stakeholder ID
        stakeholder.id = id;
        
        // Emit an event
        emit!(StakeholderCreated {
            id: stakeholder.id,
        });

        msg!("Stakeholder created with id: {:?}", id);
        Ok(())
    }

    pub fn issue_stock(
        ctx: Context<IssueStock>,
        stock_class_id: [u8; 16],
        security_id: [u8; 16],
        quantity: u64,
        share_price: u64,
    ) -> Result<()> {
        let stock_class = &mut ctx.accounts.stock_class;
        let issuer = &mut ctx.accounts.issuer;
        let position = &mut ctx.accounts.position;
        let stakeholder = &ctx.accounts.stakeholder;

        // Validate shares available
        require!(
            stock_class.shares_issued + quantity <= stock_class.shares_authorized,
            StockError::InsufficientShares
        );

        // Initialize the position
        position.stakeholder_id = stakeholder.id;
        position.stock_class_id = stock_class_id;
        position.security_id = security_id;
        position.quantity = quantity;
        position.share_price = share_price;

        // Update share counts
        stock_class.shares_issued += quantity;
        issuer.shares_issued += quantity;

        emit!(StockIssued {
            stock_class_id,
            security_id,
            stakeholder_id: stakeholder.id,
            quantity,
            share_price,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct InitializeIssuer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 8 + 8,
        seeds = [
            b"issuer",
            id.as_ref(),
        ],
        bump
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
#[instruction(id: [u8; 16])]
pub struct CreateStockClass<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 40 + 8 + 8 + 8,
        seeds = [
            b"stock_class",
            id.as_ref(),
        ],
        bump
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

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct CreateStakeholder<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 16,
        seeds = [
            b"stakeholder",
            id.as_ref(),
        ],
        bump
    )]
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(stock_class_id: [u8; 16], security_id: [u8; 16], quantity: u64, share_price: u64)]
pub struct IssueStock<'info> {
    #[account(mut)]
    pub stock_class: Account<'info, StockClass>,
    #[account(mut)]
    pub issuer: Account<'info, Issuer>,
    #[account(
        constraint = stock_class.id == stock_class_id @ StockError::InvalidStockClass
    )]
    pub stakeholder: Account<'info, Stakeholder>,
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 16 + 16 + 8 + 8,
        seeds = [
            b"stock_position",
            stakeholder.id.as_ref(),
            security_id.as_ref()
        ],
        bump
    )]
    pub position: Account<'info, StockPosition>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
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

#[account]
#[derive(Default)]
pub struct Stakeholder {
    pub id: [u8; 16],          // bytes16 equivalent
}

#[account]
#[derive(Default)]
pub struct StockPosition {
    pub stakeholder_id: [u8; 16],    // bytes16
    pub stock_class_id: [u8; 16],    // bytes16
    pub security_id: [u8; 16],       // bytes16
    pub quantity: u64,
    pub share_price: u64,
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

#[error_code]
pub enum IssuerError {
    #[msg("Issuer has already been initialized")]
    AlreadyInitialized,
}

#[error_code]
pub enum StockError {
    #[msg("Insufficient shares available for issuance")]
    InsufficientShares,
    #[msg("Invalid stakeholder")]
    InvalidStakeholder,
    #[msg("Invalid stock class")]
    InvalidStockClass,
}
