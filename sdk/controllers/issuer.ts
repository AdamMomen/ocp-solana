import { Program, web3, AnchorProvider } from "@coral-xyz/anchor";
import { OcpSolana } from "../../target/types/ocp_solana";
import { uuidToBytes16, stringNumberToBN } from "../helpers";

export interface CreateIssuerParams {
  id: string; // UUID
  sharesAuthorized: string; // String number like "1000000"
  connection: web3.Connection;
  program: Program<OcpSolana>;
  wallet: AnchorProvider;
}

export async function createIssuer({
  id,
  sharesAuthorized,
  connection,
  program,
  wallet,
}: CreateIssuerParams): Promise<{ issuerPda: web3.PublicKey }> {
  try {
    // Convert inputs
    const idBytes = uuidToBytes16(id);
    const sharesAuthorizedBN = stringNumberToBN(sharesAuthorized);

    // Find PDA
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(idBytes)],
      program.programId
    );
    // Send transaction
    const tx = await program.methods
      .initializeIssuer(idBytes, sharesAuthorizedBN)
      .accounts({ authority: wallet.publicKey })
      .rpc();

    // Wait for confirmation
    await connection.confirmTransaction(tx);

    return { issuerPda };
  } catch (error) {
    console.error("Error creating issuer:", error);
    throw error;
  }
}

export async function getIssuer(
  program: Program<OcpSolana>,
  issuerPda: web3.PublicKey
) {
  try {
    const issuer = await program.account.issuer.fetch(issuerPda);
    return issuer;
  } catch (error) {
    console.error("Error fetching issuer:", error);
    throw error;
  }
}
