import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Stakeholder Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const testId = new Uint8Array(16).fill(1); // Create a test bytes16 ID

  it("Creates a stakeholder", async () => {
    try {
      // Find PDA for stakeholder
      const [stakeholderPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stakeholder"), Buffer.from(testId)],
        program.programId
      );

      await program.methods
        .createStakeholder(Array.from(testId))
        .accounts({
          stakeholder: stakeholderPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the created account
      const stakeholderAccount = await program.account.stakeholder.fetch(
        stakeholderPda
      );

      // Verify the account data
      expect(Buffer.from(stakeholderAccount.id).equals(Buffer.from(testId))).to
        .be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Creates multiple stakeholders with different IDs", async () => {
    const testId2 = new Uint8Array(16).fill(2); // Different ID for second stakeholder

    // Find PDA for second stakeholder
    const [stakeholder2Pda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(testId2)],
      program.programId
    );

    try {
      await program.methods
        .createStakeholder(Array.from(testId2))
        .accounts({
          stakeholder: stakeholder2Pda,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the created account
      const stakeholderAccount = await program.account.stakeholder.fetch(
        stakeholder2Pda
      );

      // Verify the account data
      expect(Buffer.from(stakeholderAccount.id).equals(Buffer.from(testId2))).to
        .be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Can fetch all stakeholders", async () => {
    try {
      // Fetch all stakeholder accounts
      const allStakeholders = await program.account.stakeholder.all();

      // Verify we have at least the stakeholders we created
      expect(allStakeholders.length).to.be.at.least(2);

      // Verify each stakeholder has a valid ID (16 bytes)
      allStakeholders.forEach((stakeholder) => {
        expect(stakeholder.account.id).to.have.lengthOf(16);
      });
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
