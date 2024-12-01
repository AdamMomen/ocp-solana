// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
import { createIssuer, getIssuer } from "../sdk/controllers/issuer";

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  const wallet = anchor.workspace.OcpSolana.provider.wallet.payer;
  const connection = provider.connection;

  try {
    console.log("Testing issuer creation...");

    const { issuerPda } = await createIssuer({
      id: "123e4567-e89b-12d3-a456-426614174000", // Test UUID
      sharesAuthorized: "1000000",
      connection,
      program,
      wallet,
    });

    console.log("Issuer created at:", issuerPda.toString());

    const issuer = await getIssuer(program, issuerPda);
    console.log("Issuer data:", issuer);
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
};
