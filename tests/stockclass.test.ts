import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Stock Class Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const testId = new Uint8Array(16).fill(1); // Create a test bytes16 ID
  const classType = "COMMON";
  const pricePerShare = new anchor.BN(1000000); // 1 USDC
  const initialShares = new anchor.BN(1000000);
  const newSharesAuthorized = new anchor.BN(2000000);

  it("Creates a stock class", async () => {
    try {
      // Find PDA for stock class
      const [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_class"), Buffer.from(testId)],
        program.programId
      );

      await program.methods
        .createStockClass(
          Array.from(testId),
          classType,
          pricePerShare,
          initialShares
        )
        .accounts({
          stockClass: stockClassPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Fetch the created account
      const stockClassAccount = await program.account.stockClass.fetch(
        stockClassPda
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

  it("Creates a preferred stock class", async () => {
    const preferredId = new Uint8Array(16).fill(2); // Different ID for preferred
    const preferredClassType = "PREFERRED";

    // Find PDA for preferred stock class
    const [preferredStockPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(preferredId)],
      program.programId
    );

    try {
      await program.methods
        .createStockClass(
          Array.from(preferredId),
          preferredClassType,
          pricePerShare,
          initialShares
        )
        .accounts({
          stockClass: preferredStockPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Fetch the created account
      const stockClassAccount = await program.account.stockClass.fetch(
        preferredStockPda
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

  it("Adjusts authorized shares for stock class", async () => {
    try {
      // Find PDA for stock class (using the same testId from creation)
      const [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_class"), Buffer.from(testId)],
        program.programId
      );

      await program.methods
        .adjustStockClassShares(newSharesAuthorized)
        .accounts({
          stockClass: stockClassPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the updated account
      const stockClassAccount = await program.account.stockClass.fetch(
        stockClassPda
      );

      // Verify the updated shares
      expect(stockClassAccount.sharesAuthorized.eq(newSharesAuthorized)).to.be
        .true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
