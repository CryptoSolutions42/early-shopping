import { envConfig } from './environment';

export const ENV = {
  SOLANA_MAINNET: envConfig<string>('SOLANA_MAINNET'),
  JUPITER_URL: envConfig<string>('JUPITER_URL'),
  SOLANA_PRIVATE_KEY: envConfig<string>('SOLANA_PRIVATE_KEY'),
  RAYDIUM_AUTHORITY_V4: envConfig<string>('RAYDIUM_AUTHORITY_V4'),
  PUMP_FUN_TOKEN_MINT: envConfig<string>('PUMP_FUN_TOKEN_MINT'),
  PUMP_FUN_MINT_CONTRACT: envConfig<string>('PUMP_FUN_MINT_CONTRACT'),
  JUPITER_AGGREGATOR_V6: envConfig<string>('JUPITER_AGGREGATOR_V6'),
  JUPITER_LO_PROGRAM_ADDRESS: envConfig<string>('JUPITER_LO_PROGRAM_ADDRESS'),
};
