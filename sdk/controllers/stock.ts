import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function issueStock({
  securityId,
  stockClassId,
  stakeholderId,
  quantity,
  sharePrice,
}: {
  securityId: string;
  stockClassId: string;
  stakeholderId: string;
  quantity: string;
  sharePrice: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const securityIdBytes = uuidToBytes16(securityId);
    const stockClassIdBytes = uuidToBytes16(stockClassId);
    const stakeholderIdBytes = uuidToBytes16(stakeholderId);
    const quantityBN = stringNumberToBN(quantity);
    const sharePriceBN = stringNumberToBN(sharePrice);

    // Find PDAs
    const [stockClassPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(stockClassIdBytes)],
      program.programId
    );

    const [stakeholderPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stakeholder"), Buffer.from(stakeholderIdBytes)],
      program.programId
    );

    const [positionPda] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("stock_position"),
        Buffer.from(stakeholderIdBytes),
        Buffer.from(securityIdBytes),
      ],
      program.programId
    );

    const tx = await program.methods
      .issueStock(securityIdBytes, quantityBN, sharePriceBN)
      .accounts({
        stockClass: stockClassPda,
        stakeholder: stakeholderPda,
        authority: program.provider.publicKey,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return positionPda;
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

export async function getStockPosition(positionPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    return await program.account.stockActivePosition.fetch(positionPda);
  } catch (error) {
    console.error("Error fetching stock position:", error);
    throw error;
  }
}
