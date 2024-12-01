import { BN } from "@coral-xyz/anchor";

type Bytes16 = number[];
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
