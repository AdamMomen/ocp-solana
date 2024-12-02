// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { v4 as uuid } from "uuid";
import { createIssuer, getIssuer } from "../sdk/controllers/issuer";
import { createStakeholder } from "../sdk/controllers/stakeholder";
import { createStockClass } from "../sdk/controllers/stockclass";
import { createStockPlan } from "../sdk/controllers/stockplan";
import { issueStock } from "../sdk/controllers/stock";
import {
  exerciseEquityCompensation,
  issueEquityCompensation,
} from "../sdk/controllers/equity_compensation";
import { getWarrantPosition, issueWarrant } from "../sdk/controllers/warrant";
import { issueConvertible } from "../sdk/controllers/convertible";
import { web3 } from "@coral-xyz/anchor";

module.exports = async function (/* provider */) {
  // const issuerId = "124e4567-e89b-12d3-a456-426614173999";
  // const stockClassId = "126e4567-e89b-12d3-a456-426614173999";
  // const stockPlanId = "127e4567-e89b-12d3-a456-426614173999";
  // const stakeholderId = "125e4567-e89b-12d3-a456-426614173999";
  // const stockSecurityId = "128e4567-e89b-12d3-a456-426614173999";
  // const equityCompSecurityId = "129e4567-e89b-12d3-a456-426614173999";
  // const warrantSecurityId = "130e4567-e89b-12d3-a456-426614173999";
  // const convertibleSecurityId = "131e4567-e89b-12d3-a456-426614173999";
  const issuerId = uuid();
  const stockClassId = uuid();
  const stockPlanId = uuid();
  const stakeholderId = uuid();
  const stockSecurityId = uuid();
  const equityCompSecurityId = uuid();
  const warrantSecurityId = uuid();
  const convertibleSecurityId = uuid();
  try {
    console.log("Testing issuer creation...");
    const issuerPda = await createIssuer({
      id: issuerId,
      sharesAuthorized: "1000000",
    });
    console.log("Issuer created at:", issuerPda.publicKey);
    const issuer = await getIssuer(issuerPda.publicKey);
    console.log("Issuer data:", issuer);
    const stakeholderPda = await createStakeholder({
      id: stakeholderId,
      issuerId: issuerId,
    });
    console.log("Stakeholder created at:", stakeholderPda.toString());
    const stockClassPda = await createStockClass({
      id: stockClassId,
      issuerId,
      classType: "COMMON",
      pricePerShare: "100",
      sharesAuthorized: "1000000",
    });
    console.log("Stock class created at:", stockClassPda.toString());
    const stockPlanPda = await createStockPlan({
      id: stockPlanId,
      issuerId,
      stockClassIds: [stockClassId],
      sharesReserved: "1000000",
    });
    console.log("Stock plan created at:", stockPlanPda.toString());
    const stockPda = await issueStock({
      issuerId,
      securityId: stockSecurityId,
      stockClassId,
      stakeholderId,
      quantity: "100",
      sharePrice: "100",
    });
    console.log("Stock issued at:", stockPda.toString());
    const equityCompensationPda = await issueEquityCompensation({
      issuerId,
      securityId: equityCompSecurityId,
      stockClassId,
      stakeholderId,
      quantity: "100",
    });
    console.log("Equity Position issued at:", equityCompensationPda.toString());
    const equityExercisePda = await exerciseEquityCompensation({
      issuerId,
      equityCompSecurityId,
      stockClassId,
      resultingStockSecurityId: stockSecurityId,
      stakeholderId,
      quantity: "100",
    });
    console.log("Equity Position exercised at:", equityExercisePda.toString());
    const warrantPda = await issueWarrant({
      issuerId,
      securityId: warrantSecurityId,
      stakeholderId,
      quantity: "100",
    });
    console.log("Warrant issued at:", warrantPda.toString());
    const warrantPosition = await getWarrantPosition(warrantPda);
    console.log("Warrant position data:", warrantPosition);
    const convertiblePositionPda = await issueConvertible({
      issuerId,
      securityId: convertibleSecurityId,
      stakeholderId,
      investmentAmount: "1000000", // 1 USDC
    });
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
};
