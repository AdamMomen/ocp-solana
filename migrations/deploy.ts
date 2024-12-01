// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { createIssuer, getIssuer } from "../sdk/controllers/issuer";

module.exports = async function (/* provider */) {
  try {
    console.log("Testing issuer creation...");

    const { issuerPda } = await createIssuer({
      id: "124e4567-e89b-12d3-a456-426614173999",
      sharesAuthorized: "1000000",
    });

    console.log("Issuer created at:", issuerPda.toString());

    const issuer = await getIssuer(issuerPda);
    console.log("Issuer data:", issuer);
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
};
