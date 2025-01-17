import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";
import { isTxType } from "./helpers";

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
        // @ts-ignore
        issuer: issuerPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stakeholder
    await program.methods
      .createStakeholder(Array.from(stakeholderId))
      .accounts({
        issuer: issuerPda,
        // @ts-ignore
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
        issuer: issuerPda,
        // @ts-ignore
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
        issuer: issuerPda,
        // @ts-ignore
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
        Buffer.from(equityCompSecurityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
      ],
      program.programId
    );

    await program.methods
      .issueEquityCompensation(Array.from(equityCompSecurityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        // @ts-ignore
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
      .issueStock(Array.from(resultingStockSecurityId), quantity, sharePrice)
      .accounts({
        issuer: issuerPda,
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: stockPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Find equity compensation position
    const [equityPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(equityCompSecurityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
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
      .exerciseEquityCompensation(quantity)
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
        Buffer.from(newEquitySecurityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
      ],
      program.programId
    );

    await program.methods
      .issueEquityCompensation(Array.from(newEquitySecurityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        // @ts-ignore
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
      .issueStock(Array.from(newStockSecurityId), differentQuantity, sharePrice)
      .accounts({
        issuer: issuerPda,
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: stockPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .exerciseEquityCompensation(quantity)
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

  it("Issues equity compensation and emits TxCreated event", async () => {
    const securityId = new Uint8Array(16).fill(35);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(securityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
      ],
      program.programId
    );

    const eventPromise = new Promise((resolve, reject) => {
      const listener = program.addEventListener("txCreated", (event) => {
        program.removeEventListener(listener);
        resolve(event);
      });

      setTimeout(() => {
        program.removeEventListener(listener);
        reject(new Error("Timeout waiting for event"));
      }, 30000);
    });

    await program.methods
      .issueEquityCompensation(Array.from(securityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        // @ts-ignore
        position: positionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const event = (await eventPromise) as any;
    expect(isTxType(event, "EquityCompensationIssuance")).to.be.true;

    const decodedData = program.coder.types.decode(
      "equityCompensationIssued",
      event.txData
    );

    expect(
      Buffer.from(decodedData.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(
      Buffer.from(decodedData.stockClassId).equals(Buffer.from(stockClassId))
    ).to.be.true;
    expect(
      Buffer.from(decodedData.stockPlanId).equals(Buffer.from(stockPlanId))
    ).to.be.true;
    expect(Buffer.from(decodedData.securityId).equals(Buffer.from(securityId)))
      .to.be.true;
    expect(decodedData.quantity.eq(quantity)).to.be.true;
  });

  it("Exercises equity compensation and emits TxCreated event", async () => {
    const securityId = new Uint8Array(16).fill(45);
    const resultingStockSecurityId = new Uint8Array(16).fill(46);

    // First create equity compensation position
    const [equityPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(securityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
      ],
      program.programId
    );

    // Issue equity compensation first
    await program.methods
      .issueEquityCompensation(Array.from(securityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        // @ts-ignore
        position: equityPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stock position that will result from exercise
    const [stockPositionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(resultingStockSecurityId),
      ],
      program.programId
    );

    // Issue stock with matching quantity
    await program.methods
      .issueStock(Array.from(resultingStockSecurityId), quantity, sharePrice)
      .accounts({
        issuer: issuerPda,
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: stockPositionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Now set up event listener for exercise
    const eventPromise = new Promise((resolve, reject) => {
      const listener = program.addEventListener("txCreated", (event) => {
        program.removeEventListener(listener);
        resolve(event);
      });

      setTimeout(() => {
        program.removeEventListener(listener);
        reject(new Error("Timeout waiting for event"));
      }, 30000);
    });

    // Exercise the equity compensation
    await program.methods
      .exerciseEquityCompensation(quantity)
      .accounts({
        issuer: issuerPda,
        equityPosition: equityPositionPda,
        // @ts-ignore
        stockPosition: stockPositionPda,
        authority: authority.publicKey,
      })
      .rpc();

    const event = (await eventPromise) as any;
    expect(isTxType(event, "EquityCompensationExercise")).to.be.true;

    const decodedData = program.coder.types.decode(
      "equityCompensationExercised",
      event.txData
    );

    expect(
      Buffer.from(decodedData.equityCompSecurityId).equals(
        Buffer.from(securityId)
      )
    ).to.be.true;
    expect(
      Buffer.from(decodedData.resultingStockSecurityId).equals(
        Buffer.from(resultingStockSecurityId)
      )
    ).to.be.true;
    expect(decodedData.quantity.eq(quantity)).to.be.true;
  });

  it("Issues equity compensation without stock plan", async () => {
    const securityId = new Uint8Array(16).fill(50);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(securityId),
        Buffer.from(stockClassId),
        Buffer.from(stakeholderId),
      ],
      program.programId
    );

    await program.methods
      .issueEquityCompensation(Array.from(securityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: null,
        // @ts-ignore
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
    // Verify stock_plan_id is zero when not provided
    expect(
      Buffer.from(position.stockPlanId).equals(Buffer.from(new Uint8Array(16)))
    ).to.be.true;
    expect(Buffer.from(position.securityId).equals(Buffer.from(securityId))).to
      .be.true;
    expect(position.quantity.eq(quantity)).to.be.true;
  });
});
