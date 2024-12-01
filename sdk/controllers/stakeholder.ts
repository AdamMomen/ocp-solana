import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function createStakeholder({
  id,
  issuerId,
}: {
  id: string;
  issuerId: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const idBytes = uuidToBytes16(id);
    const issuerIdBytes = uuidToBytes16(issuerId);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stakeholderPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(idBytes)],
      program.programId
    );

    const tx = await program.methods
      .createStakeholder(idBytes)
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        // @ts-ignore
        stakeholder: stakeholderPda,
        authority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return stakeholderPda;
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

export async function getStakeholder(stakeholderPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const stakeholder = await program.account.stakeholder.fetch(stakeholderPda);
    return stakeholder;
  } catch (error) {
    console.error("Error fetching stakeholder:", error);
    throw error;
  }
}
