import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Stock Class Tests", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;

  // Test accounts
  const stockClassKeypair = anchor.web3.Keypair.generate();
  const authority = provider.wallet;

  // Test data
  const testId = new Uint8Array(16).fill(1); // Create a test bytes16 ID
  const classType = "COMMON";
  const pricePerShare = new anchor.BN(1000000); // 1 USDC
  const initialShares = new anchor.BN(1000000);
  const newSharesAuthorized = new anchor.BN(2000000);

  it("Creates a stock class", async () => {
    try {
      await program.methods
        .createStockClass(
          Array.from(testId),
          classType,
          pricePerShare,
          initialShares
        )
        .accounts({
          stockClass: stockClassKeypair.publicKey,
          authority: authority.publicKey,
        })
        .signers([stockClassKeypair])
        .rpc();

      // Fetch the created account
      const stockClassAccount = await program.account.stockClass.fetch(
        stockClassKeypair.publicKey
      );

      // Verify the account data
      expect(Buffer.from(stockClassAccount.id).equals(Buffer.from(testId))).to
        .be.true;
      expect(stockClassAccount.classType).to.equal(classType);
      expect(stockClassAccount.pricePerShare.eq(pricePerShare)).to.be.true;
      expect(stockClassAccount.sharesIssued.eq(new anchor.BN(0))).to.be.true;
      expect(stockClassAccount.sharesAuthorized.eq(initialShares)).to.be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Adjusts authorized shares for stock class", async () => {
    try {
      await program.methods
        .adjustStockClassShares(newSharesAuthorized)
        .accounts({
          stockClass: stockClassKeypair.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the updated account
      const stockClassAccount = await program.account.stockClass.fetch(
        stockClassKeypair.publicKey
      );

      // Verify the updated shares
      expect(stockClassAccount.sharesAuthorized.eq(newSharesAuthorized)).to.be
        .true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Creates a preferred stock class", async () => {
    // Create a new keypair for preferred stock
    const preferredStockKeypair = anchor.web3.Keypair.generate();
    const preferredClassType = "PREFERRED";
    const preferredId = new Uint8Array(16).fill(2); // Different ID for preferred

    try {
      await program.methods
        .createStockClass(
          Array.from(preferredId),
          preferredClassType,
          pricePerShare,
          initialShares
        )
        .accounts({
          stockClass: preferredStockKeypair.publicKey,
          authority: authority.publicKey,
        })
        .signers([preferredStockKeypair])
        .rpc();

      // Fetch the created account
      const stockClassAccount = await program.account.stockClass.fetch(
        preferredStockKeypair.publicKey
      );

      // Verify the account data
      expect(Buffer.from(stockClassAccount.id).equals(Buffer.from(preferredId)))
        .to.be.true;
      expect(stockClassAccount.classType).to.equal(preferredClassType);
      expect(stockClassAccount.sharesIssued.eq(new anchor.BN(0))).to.be.true;
      expect(stockClassAccount.sharesAuthorized.eq(initialShares)).to.be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
