export type CreateOrderType = {
  inputMint: string;
  outputMint: string;
  maker?: string;
  payer?: string;
  params: {
    makingAmount: string;
    takingAmount: string;
    expiredAt?: string | undefined;
    feeBps?: string | undefined;
  };
  computeUnitPrice?: string | 'auto';
  referral?: string | undefined;
  inputTokenProgram?: string | undefined;
  outputTokenProgram?: string | undefined;
  wrapAndUnwrapSol?: boolean | undefined;
};

export type CancelOrders = {
  maker: string;
  computeUnitPrice: string | 'auto';
  orders?: string[] | undefined;
};

export type CreateOrderResponse = {
  order: string;
  tx: string;
};

export type CancelOrdersResponse = {
  txs: string[];
};

export type OpenOrderResponse = {
  account: DexAccountType;
  publicKey: string;
};

export type HistoryOrderResponse = {
  orders: DexOrderType[];
  hasMoreData: boolean;
  page: number;
};

export type DexOrderType = {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  remainingMakingAmount: string;
  remainingTakingAmount: string;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  openTx: string;
  closeTx: string;
  programVersion: string;
  trades: unknown[];
};

export type DexAccountType = {
  borrowMakingAmount: string;
  createdAt: string;
  expiredAt: string | null;
  makingAmount: string;
  oriMakingAmount: string;
  oriTakingAmount: string;
  takingAmount: string;
  uniqueId: string;
  updatedAt: string;
  feeAccount: string;
  inputMint: string;
  inputMintReserve: string;
  inputTokenProgram: string;
  maker: string;
  outputMint: string;
  outputTokenProgram: string;
  feeBps: number;
  bump: number;
};
