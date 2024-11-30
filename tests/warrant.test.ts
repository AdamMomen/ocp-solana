import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";
import { TxTypes, isTxType } from "./helpers";

describe("Warrant Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const issuerId = new Uint8Array(16).fill(40);
  const stakeholderId = new Uint8Array(16).fill(41);
  const securityId = new Uint8Array(16).fill(42);
  const quantity = new anchor.BN(100000);

  let issuerPda: anchor.web3.PublicKey;
  let stakeholderPda: anchor.web3.PublicKey;

  before(async () => {
    // Find PDAs
    [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerId)],
      program.programId
    );

    // Initialize issuer
    await program.methods
      .initializeIssuer(Array.from(issuerId), new anchor.BN(1000000))
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create stakeholder
    [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

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
  });

  it("Issues warrant and emits TxCreated event", async () => {
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

    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("warrant_position"),
        Buffer.from(stakeholderId),
        Buffer.from(securityId),
      ],
      program.programId
    );

    // Issue the warrant
    await program.methods
      .issueWarrant(Array.from(securityId), quantity)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        // @ts-ignore
        position: positionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // The event data is automatically deserialized by Anchor
    const event = (await eventPromise) as any;

    // Verify event type
    expect(isTxType(event, "WarrantIssuance")).to.be.true;

    // Decode the buffer using Anchor's program coder
    const decodedData = program.coder.types.decode(
      "warrantIssued", // The tuple type from our Rust code
      event.txData
    );

    // Verify the decoded data
    expect(
      Buffer.from(decodedData.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(Buffer.from(decodedData.securityId).equals(Buffer.from(securityId)))
      .to.be.true;
    expect(decodedData.quantity.eq(quantity)).to.be.true;
  });

  it("Fails when attempting to issue warrant with zero quantity", async () => {
    const newSecurityId = new Uint8Array(16).fill(43);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("warrant_position"),
        Buffer.from(stakeholderId),
        Buffer.from(newSecurityId),
      ],
      program.programId
    );

    try {
      await program.methods
        .issueWarrant(Array.from(newSecurityId), new anchor.BN(0))
        .accounts({
          issuer: issuerPda,
          stakeholder: stakeholderPda,
          // @ts-ignore
          position: positionPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("InvalidQuantity");
    }
  });
});
