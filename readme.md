# OCP Solana

A Solana implementation of the Open Cap Table Protocol (OCP), originally created by Victor Mimo ([open-captable-protocol](https://github.com/victormimo/open-captable-protocol)).

## Overview

This project implements the Open Cap Table Protocol on Solana, providing a decentralized way to manage cap tables. The program handles various equity operations including:

- Stock Issuance
- Convertible Issuance
- Warrant Issuance
- Equity Compensation Issuance & Exercise
- Stock Plan Management
- Stakeholder Management

### Core Functionality

The main program (`lib.rs`) implements the following key features:

- **Transaction Creation**: Handles various equity transaction types with standardized data structures
- **Event Emission**: Emits standardized events for off-chain indexing
- **PDA Management**: Uses Program Derived Addresses for secure data storage
- **Data Validation**: Enforces business rules and data integrity
- **Access Control**: Implements authority checks for sensitive operations

### Architecture

The program follows OCP's data model while leveraging Solana's unique features:

- Uses PDAs for deterministic account generation
- Implements Anchor's account validation
- Emits structured events for off-chain syncing
- Handles decimal precision for share quantities and prices
- Manages stakeholder and security relationships

## Getting Started

### Prerequisites

- Node.js
- Yarn
- Rust
- Solana CLI
- Anchor Framework

### Installation

```bash
yarn install
```

### Testing

```bash
yarn test
```

## Credits

This project builds upon the Open Cap Table Protocol created by [Victor Mimo](https://github.com/victormimo). The original implementation and protocol specification can be found at [open-captable-protocol](https://github.com/victormimo/open-captable-protocol).

## License

MIT License - see LICENSE file for details
