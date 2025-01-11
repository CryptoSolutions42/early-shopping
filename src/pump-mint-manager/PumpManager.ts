import {
  CompiledInstruction,
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { DexSwap } from '../dex/dex';

export class PumpManager extends DexSwap {
  private pumpToken: { [key: string]: string }[];

  private transactionCache = new Map<string, any>();
  private requestQueue: { signature: string; resolve: Function; reject: Function }[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000;

  constructor(
    private connection: Connection,
    private programId: PublicKey,
  ) {
    super();
    this.pumpToken = [];
  }

  public async watchNewPairs() {
    if (!this.programId) {
      throw new Error('ProgramId is not initialized');
    }

    const version = await this.connection.getVersion();
    console.log('Connected to Solana node version:', version);

    const subscribeIdSearch = this.connection.onLogs(
      this.programId,
      async (logs, { slot }) => {
        console.log('search is started => ');
        if (logs.err) return;

        const { signature } = logs;

        const isNewToken = logs.logs.some(
          (log) => log === 'Program log: Instruction: InitializeMint2' || log === 'Program log: Create',
        );

        if (isNewToken) {
          await this.searchPumpAddress(signature, subscribeIdSearch);
        }
      },
      'finalized',
    );
  }

  private async searchPumpAddress(signature: string, subscribeIdSearch: number) {
    await this.removeSubscription(subscribeIdSearch);
    const tx = await this.getTransactionWithRetry(signature);
    if (!tx) return;
    if (!tx?.meta) return;
    if (!tx?.meta?.innerInstructions) return;

    instructionLoop: for (const instruction of tx.meta.innerInstructions[0].instructions) {
      if ('parsed' in instruction) {
        if ('info' in instruction.parsed) {
          if ('mint' in instruction.parsed.info && 'wallet' in instruction.parsed.info) {
            let isSell = false;
            const tokenAddress = instruction.parsed.info.mint;
            const accountAddress = instruction.parsed.info.wallet;
            console.log(`tokenAddress => ${tokenAddress}`);
            console.log(`accountAddress => ${accountAddress}`);

            try {
              this.pumpToken.push({ [accountAddress]: tokenAddress });
              console.log(`BUY TOKEN ${tokenAddress}`);

              const subscribeIdSell = this.connection.onLogs(
                new PublicKey(accountAddress),
                async (logs) => {
                  console.log('sell watcher listen => ');
                  if (logs.err) return;
                  const isSellOperation = logs.logs.some((log) => log === 'Program log: Instruction: Sell');

                  if (isSellOperation) {
                    console.log(`SELL TOKEN ${tokenAddress}`);
                    this.pumpToken.forEach(async (token, index) => {
                      if (token[accountAddress]) {
                        this.pumpToken.slice(index, 1);
                        console.log('deleted token');
                      }
                    });
                    isSell = true;
                    if (isSell) {
                      await this.removeSubscription(subscribeIdSell);
                      console.log('Token Address:', this.pumpToken);
                    }
                  }
                },
                'confirmed',
              );

              break instructionLoop;
            } catch (error) {
              console.error('Failed process: ', error);
              await this.sleep(100);
            }
          }
        }
      }
    }
  }

  private async removeSubscription(subscribeId: number) {
    if (subscribeId) {
      return;
    }

    try {
      await this.connection.removeOnLogsListener(subscribeId);
      console.log('Subscription removed:', subscribeId);
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  }

  private async checkLiquidity(poolAddress: string): Promise<{ isEnough: boolean; amount: number }> {
    try {
      const poolInfo = await this.connection.getAccountInfo(new PublicKey(poolAddress));
      if (!poolInfo) return { isEnough: false, amount: 0 };

      // Проверка минимальной ликвидности
      const liquidityAmount = 0; // Здесь нужно декодировать данные пула
      return {
        isEnough: liquidityAmount >= 0,
        amount: liquidityAmount,
      };
    } catch (error) {
      console.error('Error checking liquidity:', error);
      return { isEnough: false, amount: 0 };
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.REQUEST_DELAY) {
        await this.sleep(this.REQUEST_DELAY - timeSinceLastRequest);
      }

      try {
        const tx = await this.connection.getParsedTransaction(request.signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'finalized',
        });

        if (tx) {
          this.transactionCache.set(request.signature, tx);
        }

        request.resolve(tx);
      } catch (error: unknown) {
        const { message } = error as { message: string };
        if (message.includes('429')) {
          await this.sleep(this.REQUEST_DELAY);
          continue;
        }
        request.reject(error);
      }

      this.requestQueue.shift();
      this.lastRequestTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  private async getTransaction(signature: string) {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'finalized',
      });

      return tx;
    } catch (error: unknown) {
      const { message } = error as { message: string };
      return;
    }
  }

  private async getTransactionWithRetry(signature: string): Promise<ParsedTransactionWithMeta> {
    // Проверяем кэш
    if (this.transactionCache.has(signature)) {
      return this.transactionCache.get(signature);
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ signature, resolve, reject });
      this.processQueue();
    });
  }
}
