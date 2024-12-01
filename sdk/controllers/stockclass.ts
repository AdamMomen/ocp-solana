import { getProvider, web3 } from "@coral-xyz/anchor";
import { uuidToBytes16, stringNumberToBN, getProgram } from "../helpers";
import { SendTransactionError } from "@solana/web3.js";

export async function createStockClass({
  id,
  issuerId,
  classType,
  pricePerShare,
  sharesAuthorized,
}: {
  id: string;
  issuerId: string;
  classType: string;
  pricePerShare: string;
  sharesAuthorized: string;
}): Promise<web3.PublicKey> {
  try {
    const { program } = getProgram();
    const provider = getProvider();

    const idBytes = uuidToBytes16(id);
    const issuerIdBytes = uuidToBytes16(issuerId);
    const pricePerShareBN = stringNumberToBN(pricePerShare);
    const sharesAuthorizedBN = stringNumberToBN(sharesAuthorized);

    // Find PDAs
    const [issuerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("issuer"), Buffer.from(issuerIdBytes)],
      program.programId
    );

    const [stockClassPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("stock_class"), Buffer.from(idBytes)],
      program.programId
    );

    const tx = await program.methods
      .createStockClass(idBytes, classType, pricePerShareBN, sharesAuthorizedBN)
      .accounts({
        // @ts-ignore
        issuer: issuerPda,
        // @ts-ignore
        stockClass: stockClassPda,
        authority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await provider.connection.confirmTransaction(tx);
    return stockClassPda;
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

export async function getStockClass(stockClassPda: web3.PublicKey) {
  try {
    const { program } = getProgram();
    const stockClass = await program.account.stockClass.fetch(stockClassPda);
    return stockClass;
  } catch (error) {
    console.error("Error fetching stock class:", error);
    throw error;
  }
}
