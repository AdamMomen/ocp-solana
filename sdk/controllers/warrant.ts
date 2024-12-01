import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function issueWarrant({
  issuerId,
  securityId,
  stakeholderId,
  quantity,
}: {
  issuerId: string;
  securityId: string;
  stakeholderId: string;
  quantity: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const issuerIdBytes = uuidToBytes16(issuerId);
    const securityIdBytes = uuidToBytes16(securityId);
    const stakeholderIdBytes = uuidToBytes16(stakeholderId);
    const quantityBN = stringNumberToBN(quantity);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stakeholderPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderIdBytes)],
      program.programId
    );

    const [warrantPositionPda] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("warrant_position"),
        Buffer.from(stakeholderIdBytes),
        Buffer.from(securityIdBytes),
      ],
      program.programId
    );

    const tx = await program.methods
      .issueWarrant(securityIdBytes, quantityBN)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        authority: program.provider.publicKey,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return warrantPositionPda;
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

export async function getWarrantPosition(positionPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const position = await program.account.warrantActivePosition.fetch(
      positionPda
    );

    // Convert raw data to readable format
    const decodedPosition = {
      stakeholderId: Buffer.from(position.stakeholderId).toString("hex"),
      securityId: Buffer.from(position.securityId).toString("hex"),
      quantity: position.quantity.toString(),
    };

    console.log("Warrant position decoded data:", decodedPosition);
    return decodedPosition;
  } catch (error) {
    console.error("Error fetching warrant position:", error);
    throw error;
  }
}
