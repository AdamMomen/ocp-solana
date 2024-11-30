import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Equity Compensation Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const issuerId = new Uint8Array(16).fill(19);
  const stakeholderId = new Uint8Array(16).fill(20);
  const stockClassId = new Uint8Array(16).fill(21);
  const stockPlanId = new Uint8Array(16).fill(22);
  const equityCompSecurityId = new Uint8Array(16).fill(23);
  const resultingStockSecurityId = new Uint8Array(16).fill(24);
  const quantity = new anchor.BN(100000);
  const sharePrice = new anchor.BN(1000000); // 1 USDC
  const initialShares = new anchor.BN(1000000);

  let issuerPda: anchor.web3.PublicKey;
  let stakeholderPda: anchor.web3.PublicKey;
  let stockClassPda: anchor.web3.PublicKey;
  let stockPlanPda: anchor.web3.PublicKey;

  before(async () => {
    // Find PDAs
    [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

    [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId)],
      program.programId
    );

    [stockPlanPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_plan"), Buffer.from(stockPlanId)],
      program.programId
    );
    // Create Issuer
    await program.methods
      .initializeIssuer(Array.from(issuerId), new anchor.BN(100000))
      .accounts({
        issuer: issuerPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stakeholder
    await program.methods
      .createStakeholder(Array.from(stakeholderId))
      .accounts({
        stakeholder: stakeholderPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stock class
    await program.methods
      .createStockClass(
        Array.from(stockClassId),
        "COMMON",
        sharePrice,
        initialShares
      )
      .accounts({
        stockClass: stockClassPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stock plan
    await program.methods
      .createStockPlan(
        Array.from(stockPlanId),
        [Array.from(stockClassId)],
        initialShares
      )
      .accounts({
        stockPlan: stockPlanPda,
        stockClass: stockClassPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Issues equity compensation", async () => {
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(stakeholderId),
        Buffer.from(equityCompSecurityId),
      ],
      program.programId
    );

    await program.methods
      .issueEquityCompensation(
        Array.from(equityCompSecurityId),
        Array.from(stockClassId),
        Array.from(stockPlanId),
        quantity
      )
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        position: positionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify position
    const position =
      await program.account.equityCompensationActivePosition.fetch(positionPda);
    expect(
      Buffer.from(position.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(Buffer.from(position.stockClassId).equals(Buffer.from(stockClassId)))
      .to.be.true;
    expect(Buffer.from(position.stockPlanId).equals(Buffer.from(stockPlanId)))
      .to.be.true;
    expect(position.quantity.eq(quantity)).to.be.true;
  });

  it("Exercises equity compensation", async () => {
    // First create a stock position that will result from exercise
    const [stockPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(resultingStockSecurityId),
      ],
      program.programId
    );

    // Create the stock position with matching quantity
    await program.methods
      .issueStock(
        Array.from(stockClassId),
        Array.from(resultingStockSecurityId),
        quantity,
        sharePrice
      )
      .accounts({
        issuer: issuerPda,
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        position: stockPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Find equity compensation position
    const [equityPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(stakeholderId),
        Buffer.from(equityCompSecurityId),
      ],
      program.programId
    );

    // Verify initial equity position quantity
    const initialPosition =
      await program.account.equityCompensationActivePosition.fetch(
        equityPositionPda
      );
    expect(initialPosition.quantity.eq(quantity)).to.be.true;

    // Exercise the equity compensation
    await program.methods
      .exerciseEquityCompensation(
        Array.from(equityCompSecurityId),
        Array.from(resultingStockSecurityId),
        quantity
      )
      .accounts({
        issuer: issuerPda,
        equityPosition: equityPositionPda,
        stockPosition: stockPositionPda,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify final equity position quantity
    const finalPosition =
      await program.account.equityCompensationActivePosition.fetch(
        equityPositionPda
      );
    expect(finalPosition.quantity.eq(new anchor.BN(0))).to.be.true;
  });

  it("Fails when attempting to exercise with mismatched quantities", async () => {
    const differentQuantity = new anchor.BN(50000);

    // Create new positions with different IDs
    const newEquitySecurityId = new Uint8Array(16).fill(25);
    const newStockSecurityId = new Uint8Array(16).fill(26);

    // Create equity compensation position
    const [equityPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(stakeholderId),
        Buffer.from(newEquitySecurityId),
      ],
      program.programId
    );

    await program.methods
      .issueEquityCompensation(
        Array.from(newEquitySecurityId),
        Array.from(stockClassId),
        Array.from(stockPlanId),
        quantity
      )
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        position: equityPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stock position with different quantity
    const [stockPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(newStockSecurityId),
      ],
      program.programId
    );

    await program.methods
      .issueStock(
        Array.from(stockClassId),
        Array.from(newStockSecurityId),
        differentQuantity,
        sharePrice
      )
      .accounts({
        issuer: issuerPda,
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        position: stockPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .exerciseEquityCompensation(
          Array.from(newEquitySecurityId),
          Array.from(newStockSecurityId),
          quantity
        )
        .accounts({
          issuer: issuerPda,
          equityPosition: equityPositionPda,
          stockPosition: stockPositionPda,
          authority: authority.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("QuantityMismatch");
    }
  });
});
