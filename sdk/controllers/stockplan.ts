import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function createStockPlan({
  id,
  issuerId,
  stockClassIds,
  sharesReserved,
}: {
  id: string;
  issuerId: string;
  stockClassIds: string[]; // Array of UUIDs
  sharesReserved: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const idBytes = uuidToBytes16(id);
    const issuerIdBytes = uuidToBytes16(issuerId);
    const stockClassIdBytes = stockClassIds.map((id) => uuidToBytes16(id));
    const sharesReservedBN = stringNumberToBN(sharesReserved);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stockClassPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassIdBytes[0])], // First stock class
      program.programId
    );

    const [stockPlanPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_plan"), Buffer.from(idBytes)],
      program.programId
    );

    const tx = await program.methods
      .createStockPlan(idBytes, stockClassIdBytes, sharesReservedBN)
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        // @ts-ignore
        stockClass: stockClassPda,
        // @ts-ignore
        stockPlan: stockPlanPda,
        authority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return stockPlanPda;
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

export async function getStockPlan(stockPlanPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const stockPlan = await program.account.stockPlan.fetch(stockPlanPda);
    return stockPlan;
  } catch (error) {
    console.error("Error fetching stock plan:", error);
    throw error;
  }
}
