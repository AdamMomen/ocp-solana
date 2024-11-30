import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { expect } from "chai";

describe("Issuer Program Tests", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const authority = provider.wallet;

  // Test data
  const testId = new Uint8Array(16).fill(1); // Create a test bytes16 ID
  const initialShares = new anchor.BN(1000000);
  const newSharesAuthorized = new anchor.BN(2000000);
  let issuerPda: anchor.web3.PublicKey; // PDA for issuer

  before(async () => {
    // Find PDA for issuer
    [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(testId)],
      program.programId
    );
  });

  it("Initializes an issuer", async () => {
    try {
      await program.methods
        .initializeIssuer(Array.from(testId), initialShares)
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the created account
      const issuerAccount = await program.account.issuer.fetch(issuerPda);

      // Verify the account data
      expect(Buffer.from(issuerAccount.id).equals(Buffer.from(testId))).to.be
        .true;
      expect(issuerAccount.sharesIssued.eq(new anchor.BN(0))).to.be.true;
      expect(issuerAccount.sharesAuthorized.eq(initialShares)).to.be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Adjusts authorized shares", async () => {
    try {
      // Find PDA for issuer
      const [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("issuer"), Buffer.from(testId)],
        program.programId
      );

      await program.methods
        .adjustAuthorizedShares(newSharesAuthorized)
        .accounts({
          issuer: issuerPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Fetch the updated account
      const issuerAccount = await program.account.issuer.fetch(issuerPda);

      // Verify the updated shares
      expect(issuerAccount.sharesAuthorized.eq(newSharesAuthorized)).to.be.true;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("Fails to initialize already initialized issuer", async () => {
    try {
      // Find PDA for issuer
      const [issuerPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("issuer"), Buffer.from(testId)],
        program.programId
      );

      // Attempt to initialize the same issuer again
      await program.methods
        .initializeIssuer(Array.from(testId), initialShares)
        .accounts({
          // issuer: issuerPda,
          authority: authority.publicKey,
        })
        .rpc();

      // If we reach here, the test should fail
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Expect an error about already initialized issuer
      expect(error).to.be.instanceOf(Error);
    }
  });
});
