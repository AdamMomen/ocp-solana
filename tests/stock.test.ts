import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

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

  before(async () => {
    // Find PDAs
    const [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    const [stockClassPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassId)],
      program.programId
    );

    const [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

    // Initialize issuer
    await program.methods
      .initializeIssuer(Array.from(issuerId), initialShares)
      .accounts({
        issuer: issuerPda,
        authority: authority.publicKey,
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
      })
      .rpc();

    // Create stakeholder
    await program.methods
      .createStakeholder(Array.from(stakeholderId))
      .accounts({
        stakeholder: stakeholderPda,
        authority: authority.publicKey,
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
      .issueStock(
        Array.from(stockClassId),
        Array.from(securityId),
        issuanceQuantity,
        sharePrice
      )
      .accounts({
        stockClass: stockClassPda,
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        position: positionPda,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify position
    const position = await program.account.stockPosition.fetch(positionPda);
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
});
