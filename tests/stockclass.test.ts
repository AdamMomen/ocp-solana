import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Stock Class Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Add issuer test data
  const issuerId = new Uint8Array(16).fill(0);
  let issuerPda: anchor.web3.PublicKey;

  // Test data
  const stockClassId = new Uint8Array(16).fill(31);
  const classType = "COMMON";
  const pricePerShare = new anchor.BN(1000000); // 1 USDC
  const initialShares = new anchor.BN(1000000);
  const newSharesAuthorized = new anchor.BN(2000000);
  const preferredId = new Uint8Array(16).fill(32);

  before(async () => {
    // Find issuer PDA
    [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    // Initialize issuer
    await program.methods
      .initializeIssuer(Array.from(issuerId), new anchor.BN(100000))
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Creates a stock class", async () => {
    try {
      // Find PDA for stock class
      const [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_class"), Buffer.from(stockClassId)],
        program.programId
      );

      await program.methods
        .createStockClass(
          Array.from(stockClassId),
          classType,
          pricePerShare,
          initialShares
        )
        .accounts({
          issuer: issuerPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the created account
      const stockClassAccount = await program.account.stockClass.fetch(
        stockClassPda
      );

      // Verify the account data
      expect(
        Buffer.from(stockClassAccount.id).equals(Buffer.from(stockClassId))
      ).to.be.true;
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
    const preferredId = new Uint8Array(16).fill(32); // Different ID for preferred
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
          issuer: issuerPda,
          authority: authority.publicKey,
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
        [Buffer.from("stock_class"), Buffer.from(stockClassId)],
        program.programId
      );

      await program.methods
        .adjustStockClassShares(newSharesAuthorized)
        .accounts({
          issuer: issuerPda,
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
