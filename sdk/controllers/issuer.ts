import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export interface CreateIssuerParams {
  id: string; // UUID
  sharesAuthorized: string; // String number like "1000000"
}

export async function createIssuer({
  id,
  sharesAuthorized,
}: CreateIssuerParams): Promise<{ issuerPda: web3.PublicKey }> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    console.log("Wallet pubkey:", provider.publicKey.toString());
    const idBytes = uuidToBytes16(id);
    const sharesAuthorizedBN = stringNumberToBN(sharesAuthorized);

    // Find PDA
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(idBytes)],
      program.programId
    );

    // Anchor expects account names to match the struct fields
    const tx = await program.methods
      .initializeIssuer(idBytes, sharesAuthorizedBN)
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        authority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return { issuerPda };
  } catch (error) {
    if (error instanceof SendTransactionError) {
      console.log("Transaction Error Details:");
      console.log("Message:", error.message);
      console.log("Logs:", error.logs);
      console.log("Error:", error.toString());
    }
    throw error;
  }
}

export async function getIssuer(issuerPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const issuer = await program.account.issuer.fetch(issuerPda);
    return issuer;
  } catch (error) {
    console.error("Error fetching issuer:", error);
    throw error;
  }
}
