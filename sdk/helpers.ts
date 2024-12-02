import {
  Provider,
  Program,
  AnchorProvider,
  workspace,
  setProvider,
} from "@coral-xyz/anchor";
import BN from "bn.js";
import { OcpSolana } from "../target/types/ocp_solana";
type Bytes16 = number[];

let provider: Provider;
let program: Program<OcpSolana>;
export const getProvider = () => {
  console.log("Getting provider...");
  if (provider) return provider;
  provider = AnchorProvider.env();
  setProvider(provider);
  console.log("Provider Loaded");
  return provider;
};

export const getProgram = (): {
  program: Program<OcpSolana>;
} => {
  console.log("Getting program...");
  if (program) return { program };
  program = workspace.OcpSolana as Program<OcpSolana>;
  console.log("Program Loaded");
  return { program };
};

export function uuidToBytes16(uuid: string): Bytes16 {
  const cleanUuid = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanUuid.substr(i * 2, 2), 16);
  }
  return Array.from(bytes);
}

export function bytes16ToUuid(bytes: Bytes16): string {
  console.log("Converting bytes to UUID...");
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function stringNumberToBN(amount: string): BN {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(6, "0").slice(0, 6);
  const fullAmount = `${whole}${paddedDecimal}`;
  return new BN(fullAmount);
}
