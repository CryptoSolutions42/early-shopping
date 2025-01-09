import { Connection, PublicKey } from '@solana/web3.js';
import { PumpManager } from './pump-mint-manager/PumpManager';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = new Connection(process.env.SOLANA_MAINNET!);
  const programId = new PublicKey(process.env.PUMP_FUN_TOKEN_MINT!);

  const pumpManager = new PumpManager(connection, programId);
  await pumpManager.watchNewPairs();
}

main().catch(console.error);
