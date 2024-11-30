export const TxTypes = {
  WarrantIssuance: { warrantIssuance: {} },
  StockIssuance: { stockIssuance: {} },
  ConvertibleIssuance: { convertibleIssuance: {} },
  EquityCompensationIssuance: { equityCompensationIssuance: {} },
  EquityCompensationExercise: { equityCompensationExercise: {} },
} as const;

// Type guard
export function isTxType(event: any, type: keyof typeof TxTypes): boolean {
  return JSON.stringify(event.txType) === JSON.stringify(TxTypes[type]);
}
