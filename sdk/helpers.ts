import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Provider, Program } from "@coral-xyz/anchor";
import { OcpSolana } from "../target/types/ocp_solana";
type Bytes16 = number[];

let provider: Provider;
let program: Program<OcpSolana>;
export const getProvider = () => {
  if (provider) return provider;
  provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return provider;
};

export const getProgram = (): {
  program: Program<OcpSolana>;
} => {
  if (program) return { program };
  program = anchor.workspace.OcpSolana as Program<OcpSolana>;
  return { program };
};

export function uuidToBytes16(uuid: string): Bytes16 {
  // Remove hyphens and convert to buffer
  const cleanUuid = uuid.replace(/-/g, "");
  const buffer = Buffer.from(cleanUuid, "hex");
  return Array.from(buffer);
}

export function stringNumberToBN(amount: string): BN {
  // Convert string like "1.5" to BN(1500000) for 6 decimals
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(6, "0").slice(0, 6);
  const fullAmount = `${whole}${paddedDecimal}`;
  return new BN(fullAmount);
}
