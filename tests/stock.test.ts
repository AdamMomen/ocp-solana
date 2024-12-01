import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";
import { isTxType } from "./helpers";

describe("Stock Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const issuerId = new Uint8Array(16).fill(2);
  const stockClassId = new Uint8Array(16).fill(3);
  const stakeholderId = new Uint8Array(16).fill(4);
  const securityId = new Uint8Array(16).fill(5);

  const sharePrice = new anchor.BN(1000000); // 1 USDC
  const initialShares = new anchor.BN(1000000);
  const issuanceQuantity = new anchor.BN(100000);

  let issuerPda: anchor.web3.PublicKey; // PDA for issuer
  let stockClassPda: anchor.web3.PublicKey; // PDA for stock class
  let stakeholderPda: anchor.web3.PublicKey; // PDA for stakeholder

  before(async () => {
    // Find PDAs
    [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId)],
      program.programId
    );

    [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

    // Initialize issuer
    await program.methods
      .initializeIssuer(Array.from(issuerId), initialShares)
      .accounts({ authority: authority.publicKey })
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
        authority: authority.publicKey,
        // @ts-ignore
        issuer: issuerPda,
      })
      .rpc();

    // Create stakeholder
    await program.methods
      .createStakeholder(Array.from(stakeholderId))
      .accounts({
        authority: authority.publicKey,
        // @ts-ignore
        issuer: issuerPda,
      })
      .rpc();
  });

  it("Issues stock to stakeholder", async () => {
    // Find PDAs
    const [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId)],
      program.programId
    );

    const [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    const [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(securityId),
      ],
      program.programId
    );

    await program.methods
      .issueStock(Array.from(securityId), issuanceQuantity, sharePrice)
      .accounts({
        stockClass: stockClassPda,
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: positionPda,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify position
    const position = await program.account.stockActivePosition.fetch(
      positionPda
    );
    expect(
      Buffer.from(position.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(Buffer.from(position.stockClassId).equals(Buffer.from(stockClassId)))
      .to.be.true;
    expect(Buffer.from(position.securityId).equals(Buffer.from(securityId))).to
      .be.true;
    expect(position.quantity.eq(issuanceQuantity)).to.be.true;
    expect(position.sharePrice.eq(sharePrice)).to.be.true;

    // Verify share counts
    const stockClass = await program.account.stockClass.fetch(stockClassPda);
    expect(stockClass.sharesIssued.eq(issuanceQuantity)).to.be.true;
  });

  it("Fails when attempting to issue stock with non-existent stock class", async () => {
    // Generate PDA for a stock class that doesn't exist
    const nonExistentStockClassId = new Uint8Array(16).fill(98);
    const [nonExistentStockClassPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_class"), Buffer.from(nonExistentStockClassId)],
        program.programId
      );

    try {
      await program.methods
        .issueStock(Array.from(securityId), issuanceQuantity, sharePrice)
        .accounts({
          stockClass: nonExistentStockClassPda,
          issuer: issuerPda,
          stakeholder: stakeholderPda,
          authority: authority.publicKey,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("AccountNotInitialized");
    }
  });

  it("Fails when attempting to issue stock with non-existent stakeholder", async () => {
    // Generate PDA for a stakeholder that doesn't exist
    const nonExistentStakeholderId = new Uint8Array(16).fill(99);
    const [nonExistentStakeholderPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stakeholder"), Buffer.from(nonExistentStakeholderId)],
        program.programId
      );

    // We still need the position PDA even for failure case
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(nonExistentStakeholderId),
        Buffer.from(securityId),
      ],
      program.programId
    );

    try {
      await program.methods
        .issueStock(Array.from(securityId), issuanceQuantity, sharePrice)
        .accounts({
          stockClass: stockClassPda,
          issuer: issuerPda,
          stakeholder: nonExistentStakeholderPda,
          authority: authority.publicKey,
          // @ts-ignore
          position: positionPda,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("AccountNotInitialized");
    }
  });

  it("Fails when attempting to issue stock with zero quantity", async () => {
    // Use a different security ID for this test
    const testSecurityId = new Uint8Array(16).fill(99);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(testSecurityId), // Using different security ID
      ],
      program.programId
    );

    try {
      await program.methods
        .issueStock(
          Array.from(testSecurityId), // Using different security ID
          new anchor.BN(0), // Zero quantity
          sharePrice
        )
        .accounts({
          stockClass: stockClassPda,
          issuer: issuerPda,
          stakeholder: stakeholderPda,
          authority: authority.publicKey,
          // @ts-ignore
          position: positionPda,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("InvalidQuantity");
    }
  });

  it("Fails when attempting to issue stock with zero share price", async () => {
    const testSecurityId = new Uint8Array(16).fill(100);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(testSecurityId),
      ],
      program.programId
    );

    try {
      await program.methods
        .issueStock(
          Array.from(testSecurityId),
          issuanceQuantity,
          new anchor.BN(0) // Zero share price
        )
        .accounts({
          stockClass: stockClassPda,
          issuer: issuerPda,
          stakeholder: stakeholderPda,
          authority: authority.publicKey,
          // @ts-ignore
          position: positionPda,
          // @ts-ignore
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("InvalidSharePrice");
    }
  });

  it("Issues stock and emits TxCreated event", async () => {
    const securityId = new Uint8Array(16).fill(15);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderId),
        Buffer.from(securityId),
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

    // Issue stock...
    await program.methods
      .issueStock(Array.from(securityId), issuanceQuantity, sharePrice)
      .accounts({
        stockClass: stockClassPda,
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: positionPda,
        authority: authority.publicKey,
      })
      .rpc();

    const event = (await eventPromise) as any;

    expect(isTxType(event, "StockIssuance")).to.be.true;

    const decodedData = program.coder.types.decode("stockIssued", event.txData);

    expect(
      Buffer.from(decodedData.stockClassId).equals(Buffer.from(stockClassId))
    ).to.be.true;
    expect(Buffer.from(decodedData.securityId).equals(Buffer.from(securityId)))
      .to.be.true;
    expect(
      Buffer.from(decodedData.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(decodedData.quantity.eq(issuanceQuantity)).to.be.true;
    expect(decodedData.sharePrice.eq(sharePrice)).to.be.true;
  });
});
