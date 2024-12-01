import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";
import type { OcpSolana } from "../../target/types/ocp_solana";
import type { IdlAccounts } from "@coral-xyz/anchor";

// type ConvertibleActivePosition =
//   IdlAccounts<OcpSolana>["convertibleActivePosition"];

export async function issueConvertible({
  issuerId,
  securityId,
  stakeholderId,
  investmentAmount,
}: {
  issuerId: string;
  securityId: string;
  stakeholderId: string;
  investmentAmount: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const issuerIdBytes = uuidToBytes16(issuerId);
    const securityIdBytes = uuidToBytes16(securityId);
    const stakeholderIdBytes = uuidToBytes16(stakeholderId);
    const investmentAmountBN = stringNumberToBN(investmentAmount);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stakeholderPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderIdBytes)],
      program.programId
    );

    const [convertiblePositionPda] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("convertible_position"),
        Buffer.from(stakeholderIdBytes),
        Buffer.from(securityIdBytes),
      ],
      program.programId
    );

    const tx = await program.methods
      .issueConvertible(securityIdBytes, investmentAmountBN)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        authority: program.provider.publicKey,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    const position = await getConvertiblePosition(convertiblePositionPda);
    console.log("Convertible position data:", position);

    // Return the PDA instead of the position data
    return convertiblePositionPda;
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

export async function getConvertiblePosition(positionPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const position = await program.account.convertibleActivePosition.fetch(
      positionPda
    );

    // Convert raw data to readable format
    const decodedPosition = {
      stakeholderId: Buffer.from(position.stakeholderId).toString("hex"),
      securityId: Buffer.from(position.securityId).toString("hex"),
      investmentAmount: position.investmentAmount.toString(), // Convert BN to string
    };

    console.log("Convertible position decoded data:", decodedPosition);
    return decodedPosition;
  } catch (error) {
    console.error("Error fetching convertible position:", error);
    throw error;
  }
}
