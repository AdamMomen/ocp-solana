import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Stock Plan Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const stockPlanId = new Uint8Array(16).fill(7);
  const stockClassId1 = new Uint8Array(16).fill(8);
  const stockClassId2 = new Uint8Array(16).fill(9);
  const sharesReserved = new anchor.BN(1000000);
  const newSharesReserved = new anchor.BN(2000000);

  let stockClassPda1: anchor.web3.PublicKey;
  let stockClassPda2: anchor.web3.PublicKey;

  before(async () => {
    // Create stock classes first
    [stockClassPda1] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId1)],
      program.programId
    );

    [stockClassPda2] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId2)],
      program.programId
    );

    // Create first stock class
    await program.methods
      .createStockClass(
        Array.from(stockClassId1),
        "COMMON",
        new anchor.BN(1000000),
        sharesReserved
      )
      .accounts({
        // @ts-ignore
        stockClass: stockClassPda1,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create second stock class
    await program.methods
      .createStockClass(
        Array.from(stockClassId2),
        "COMMON",
        new anchor.BN(1000000),
        sharesReserved
      )
      .accounts({
        // @ts-ignore
        stockClass: stockClassPda2,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Creates a stock plan", async () => {
    const [stockPlanPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_plan"), Buffer.from(stockPlanId)],
      program.programId
    );

    await program.methods
      .createStockPlan(
        Array.from(stockPlanId),
        [Array.from(stockClassId1), Array.from(stockClassId2)],
        sharesReserved
      )
      .accounts({
        // @ts-ignore
        stockPlan: stockPlanPda,
        stockClass: stockClassPda1,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify the created stock plan
    const stockPlan = await program.account.stockPlan.fetch(stockPlanPda);
    expect(Buffer.from(stockPlan.id).equals(Buffer.from(stockPlanId))).to.be
      .true;
    expect(stockPlan.sharesReserved.eq(sharesReserved)).to.be.true;
    expect(stockPlan.stockClassIds.length).to.equal(2);
    expect(
      Buffer.from(stockPlan.stockClassIds[0]).equals(Buffer.from(stockClassId1))
    ).to.be.true;
    expect(
      Buffer.from(stockPlan.stockClassIds[1]).equals(Buffer.from(stockClassId2))
    ).to.be.true;
  });

  it("Adjusts stock plan shares", async () => {
    const [stockPlanPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_plan"), Buffer.from(stockPlanId)],
      program.programId
    );

    await program.methods
      .adjustStockPlanShares(newSharesReserved)
      .accounts({
        stockPlan: stockPlanPda,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify the updated shares
    const stockPlan = await program.account.stockPlan.fetch(stockPlanPda);
    expect(stockPlan.sharesReserved.eq(newSharesReserved)).to.be.true;
  });

  it("Fails when creating stock plan with non-existent stock class", async () => {
    const invalidStockClassId = new Uint8Array(16).fill(101);
    const newStockPlanId = new Uint8Array(16).fill(102);

    const [invalidStockClassPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_class"), Buffer.from(invalidStockClassId)],
        program.programId
      );

    const [stockPlanPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_plan"), Buffer.from(newStockPlanId)],
      program.programId
    );

    try {
      await program.methods
        .createStockPlan(
          Array.from(newStockPlanId),
          [Array.from(invalidStockClassId)],
          sharesReserved
        )
        .accounts({
          stockClass: invalidStockClassPda,
          // @ts-ignore
          stockPlan: stockPlanPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("AccountNotInitialized");
    }
  });
});
