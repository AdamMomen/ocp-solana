import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { createIssuer, getIssuer } from "../sdk/controllers/issuer";
import { config } from "dotenv";

config();

async function main() {
  try {
    const { issuerPda } = await createIssuer({
      id: "223e4567-e89b-12d3-a457-426614173916",
      sharesAuthorized: "1000000",
    });

    console.log("Issuer created at:", issuerPda.toString());

    const issuer = await getIssuer(issuerPda);
    console.log("Issuer data:", issuer);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
