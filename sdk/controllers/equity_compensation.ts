import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function issueEquityCompensation({
  issuerId,
  securityId,
  stockClassId,
  stakeholderId,
  stockPlanId,
  quantity,
}: {
  issuerId: string;
  securityId: string;
  stockClassId: string;
  stakeholderId: string;
  stockPlanId?: string; // Optional
  quantity: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const issuerIdBytes = uuidToBytes16(issuerId);
    const securityIdBytes = uuidToBytes16(securityId);
    const stockClassIdBytes = uuidToBytes16(stockClassId);
    const stakeholderIdBytes = uuidToBytes16(stakeholderId);
    const quantityBN = stringNumberToBN(quantity);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stockClassPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassIdBytes)],
      program.programId
    );

    const [stakeholderPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderIdBytes)],
      program.programId
    );

    const [equityCompensationPositionPda] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from("equity_compensation_position"),
          Buffer.from(securityIdBytes),
          Buffer.from(stockClassIdBytes),
          Buffer.from(stakeholderIdBytes),
        ],
        program.programId
      );

    let stockPlanPda: web3.PublicKey | null = null;
    if (stockPlanId) {
      const stockPlanIdBytes = uuidToBytes16(stockPlanId);
      [stockPlanPda] = await web3.PublicKey.findProgramAddress(
        [Buffer.from("stock_plan"), Buffer.from(stockPlanIdBytes)],
        program.programId
      );
    }

    const tx = await program.methods
      .issueEquityCompensation(securityIdBytes, quantityBN)
      .accounts({
        issuer: issuerPda,
        stakeholder: stakeholderPda,
        stockClass: stockClassPda,
        stockPlan: stockPlanPda,
        authority: program.provider.publicKey,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return equityCompensationPositionPda;
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

export async function exerciseEquityCompensation({
  issuerId,
  equityCompSecurityId,
  resultingStockSecurityId,
  stockClassId,
  stakeholderId,
  quantity,
}: {
  issuerId: string;
  equityCompSecurityId: string;
  resultingStockSecurityId: string;
  stockClassId: string;
  stakeholderId: string;
  quantity: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const issuerIdBytes = uuidToBytes16(issuerId);
    const equityCompSecurityIdBytes = uuidToBytes16(equityCompSecurityId);
    const stockClassIdBytes = uuidToBytes16(stockClassId);
    const stakeholderIdBytes = uuidToBytes16(stakeholderId);
    const quantityBN = stringNumberToBN(quantity);
    const resultingStockSecurityIdBytes = uuidToBytes16(
      resultingStockSecurityId
    );

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [equityPositionPda] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("equity_compensation_position"),
        Buffer.from(equityCompSecurityIdBytes),
        Buffer.from(stockClassIdBytes),
        Buffer.from(stakeholderIdBytes),
      ],
      program.programId
    );

    const [stockPositionPda] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderIdBytes),
        Buffer.from(resultingStockSecurityIdBytes),
      ],
      program.programId
    );

    const tx = await program.methods
      .exerciseEquityCompensation(quantityBN)
      .accounts({
        issuer: issuerPda,
        equityPosition: equityPositionPda,
        stockPosition: stockPositionPda,
        authority: program.provider.publicKey,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return equityPositionPda;
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

export async function getEquityCompensationPosition(
  positionPda: web3.PublicKey
) {
  try {
    const { program } = getProgram();
    return await program.account.equityCompensationActivePosition.fetch(
      positionPda
    );
  } catch (error) {
    console.error("Error fetching equity compensation position:", error);
    throw error;
  }
}
