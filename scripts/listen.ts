import { getProgram, bytes16ToUuid } from "../sdk/helpers";
import { config } from "dotenv";
config();

async function main() {
  const { program } = getProgram();
  console.log("🎧 Starting event listener...");
  console.log("Program ID:", program.programId.toString());

  const listeners: number[] = [];

  // Listen for TxCreated events
  listeners.push(
    program.addEventListener("txCreated", (event) => {
      // Get the event type first
      const eventType = getTxDataDecodingType(event.txType);
      console.log("🔍 Event Type:", eventType);

      // Decode the event data using Anchor's decoder
      const decodedData = program.coder.types.decode(
        eventType,
        Buffer.from(event.txData)
      );

      // Convert IDs to UUIDs
      const formattedData = Object.entries(decodedData).reduce(
        (acc, [key, value]) => {
          if (value instanceof Array && value.length === 16) {
            acc[key] = bytes16ToUuid(value);
          } else if (
            typeof value === "object" &&
            value !== null &&
            value.toString
          ) {
            acc[key] = value.toString();
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as any
      );

      console.log("📝 Transaction:", {
        type: getOcfTxType(event.txType),
        data: formattedData,
      });
    })
  );

  // Listen for StakeholderCreated events
  listeners.push(
    program.addEventListener("stakeholderCreated", (event) => {
      console.log("👤 Stakeholder:", {
        // id: bytes16ToUuid(event.id),
        id: event.id,
      });
    })
  );

  // Listen for StockClassCreated events
  listeners.push(
    program.addEventListener("stockClassCreated", (event) => {
      console.log("📈 Stock Class:", {
        // id: bytes16ToUuid(event.id),
        id: event.id,
        classType: event.classType,
        pricePerShare: event.pricePerShare.toString(),
        initialSharesAuthorized: event.initialSharesAuthorized.toString(),
      });
    })
  );

  // Listen for StockPlanCreated events
  listeners.push(
    program.addEventListener("stockPlanCreated", (event) => {
      console.log("📋 Stock Plan:", {
        // id: bytes16ToUuid(event.id),
        id: event.id,
        sharesReserved: event.sharesReserved.toString(),
      });
    })
  );

  // Handle cleanup
  process.on("SIGINT", async () => {
    console.log("\n🛑 Cleaning up...");
    await Promise.all(listeners.map((id) => program.removeEventListener(id)));
    process.exit();
  });

  console.log("👂 Listening for events... (Press Ctrl+C to exit)");
}

export function getTxDataDecodingType(txType: any): string {
  const typeMap: { [key: string]: string } = {
    stockIssuance: "stockIssued",
    convertibleIssuance: "convertibleIssued",
    equityCompensationIssuance: "equityCompensationIssued",
    equityCompensationExercise: "equityCompensationExercised",
    warrantIssuance: "warrantIssued",
  };
  return typeMap[Object.keys(txType)[0]] || "unknown";
}

function getOcfTxType(txType: any): string {
  const typeMap: { [key: string]: string } = {
    stockIssuance: "TX_STOCK_ISSUANCE",
    convertibleIssuance: "TX_CONVERTIBLE_ISSUANCE",
    equityCompensationIssuance: "TX_EQUITY_COMPENSATION_ISSUANCE",
    equityCompensationExercise: "TX_EQUITY_COMPENSATION_EXERCISE",
    warrantIssuance: "TX_WARRANT_ISSUANCE",
  };
  return typeMap[Object.keys(txType)[0]] || "unknown";
}

main().catch(console.error);
