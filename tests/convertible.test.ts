import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Convertible Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const stakeholderId = new Uint8Array(16).fill(10); // Different from other tests
  const securityId = new Uint8Array(16).fill(11);
  const investmentAmount = new anchor.BN(1000000); // 1 USDC

  let stakeholderPda: anchor.web3.PublicKey;

  before(async () => {
    // Create stakeholder first
    [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderId)],
      program.programId
    );

    await program.methods
      .createStakeholder(Array.from(stakeholderId))
      .accounts({
        stakeholder: stakeholderPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Issues convertible to stakeholder", async () => {
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("convertible_position"),
        Buffer.from(stakeholderId),
        Buffer.from(securityId),
      ],
      program.programId
    );

    await program.methods
      .issueConvertible(Array.from(securityId), investmentAmount)
      .accounts({
        stakeholder: stakeholderPda,
        position: positionPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify position
    const position = await program.account.convertibleActivePosition.fetch(
      positionPda
    );
    expect(
      Buffer.from(position.stakeholderId).equals(Buffer.from(stakeholderId))
    ).to.be.true;
    expect(Buffer.from(position.securityId).equals(Buffer.from(securityId))).to
      .be.true;
    expect(position.investmentAmount.eq(investmentAmount)).to.be.true;
  });

  it("Fails when attempting to issue convertible with zero investment", async () => {
    const newSecurityId = new Uint8Array(16).fill(12);
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("convertible_position"),
        Buffer.from(stakeholderId),
        Buffer.from(newSecurityId),
      ],
      program.programId
    );

    try {
      await program.methods
        .issueConvertible(Array.from(newSecurityId), new anchor.BN(0))
        .accounts({
          stakeholder: stakeholderPda,
          position: positionPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.toString()).to.include("InvalidAmount");
    }
  });

  it("Fails when attempting to issue convertible with non-existent stakeholder", async () => {
    const invalidStakeholderId = new Uint8Array(16).fill(99);
    const newSecurityId = new Uint8Array(16).fill(13);

    const [invalidStakeholderPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stakeholder"), Buffer.from(invalidStakeholderId)],
        program.programId
      );

    const [positionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("convertible_position"),
        Buffer.from(invalidStakeholderId),
        Buffer.from(newSecurityId),
      ],
      program.programId
    );

    try {
      await program.methods
        .issueConvertible(Array.from(newSecurityId), investmentAmount)
        .accounts({
          stakeholder: invalidStakeholderPda,
          position: positionPda,
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
