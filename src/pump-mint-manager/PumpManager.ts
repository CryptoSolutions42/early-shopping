import { CompiledInstruction, Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { DexSwap } from '../dex/dex';

export class PumpManager extends DexSwap {
  private pumpToken: { [key: string]: string }[];
  private subscriptionId: number | undefined;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private readonly rateLimit = 10; // запросов в секунду
  private readonly connections: Connection[];
  private currentConnectionIndex = 0;

  constructor(
    private connection: Connection,
    private programId: PublicKey,
    private numberOfConnections = 3, // количество соединений в пуле
  ) {
    super();
    this.pumpToken = [];
    this.connections = [connection];
    // Создаем дополнительные соединения
    for (let i = 1; i < numberOfConnections; i++) {
      this.connections.push(new Connection(connection.rpcEndpoint));
      console.log(this.connections);
    }
  }

  private getNextConnection(): Connection {
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
    return this.connections[this.currentConnectionIndex];
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
          // Ждем 1000/rateLimit мс между запросами
          await new Promise((resolve) => setTimeout(resolve, 1000 / this.rateLimit));
        } catch (error) {
          console.error('Error processing request:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  public async watchNewPairs() {
    if (!this.programId) {
      throw new Error('ProgramId is not initialized');
    }

    const version = await this.enqueueRequest(() => this.connection.getVersion());
    console.log('Connected to Solana node version:', version);

    this.subscriptionId = this.connection.onLogs(
      this.programId,
      async (logs) => {
        console.log('search is started => ');
        if (logs.err) return;

        const { signature } = logs;

        const isNewToken = logs.logs.some(
          (log) => log === 'Program log: Instruction: InitializeMint2' || log === 'Program log: Create',
        );

        if (isNewToken) {
          await this.searchPumpAddress(signature);
        }
      },
      'processed',
    );
  }

  private async searchPumpAddress(signature: string) {
    const tx = await this.getTransactionWithRetry(signature);

    if (!tx) return;
    if (!tx?.meta) return;
    if (!tx?.meta?.innerInstructions) return;

    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const staticAccountKeys = tx.transaction.message.staticAccountKeys;

    instructionLoop: for (const item of tx.meta.innerInstructions) {
      for (const instruction of item.instructions) {
        if (staticAccountKeys[instruction.programIdIndex].equals(TOKEN_PROGRAM_ID)) {
          const transactionInstruction = this.compiledInstructionToTransaction(instruction, staticAccountKeys);

          try {
            const tokenAddressPubKey = transactionInstruction.keys[0].pubkey;
            const tokenAddress = tokenAddressPubKey.toBase58();
            const accountAddress = this.isNotPumpAddress(tokenAddress);
            if (this.isPumpAddress(tokenAddress) && accountAddress) {
              console.log(`BUY TOKEN ${tokenAddress}`);
              this.connection.onLogs(
                new PublicKey(accountAddress),
                async (logs) => {
                  console.log('sell watcher listen => ');
                  if (logs.err) return;

                  const isSellOperation = logs.logs.some((log) => log === 'Program log: Instruction: Sell');

                  if (isSellOperation) {
                    console.log(`SELL TOKEN ${tokenAddress}`);
                  }
                },
                'processed',
              );

              this.pumpToken.push({ [accountAddress]: tokenAddress });

              console.log('Token Address:', this.pumpToken);
              break instructionLoop;
            }
          } catch (error) {
            console.error('Failed to decode instruction:', error);
            console.log('Instruction data:', transactionInstruction.data);
            console.log('Program ID:', transactionInstruction.programId.toBase58());
            console.log(
              'Keys:',
              transactionInstruction.keys.map((k) => k.pubkey.toBase58()),
            );
          }
        }
      }
    }
  }

  private async getTransactionWithRetry(signature: string, maxRetries = 5, initialDelay = 1000): Promise<any> {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.enqueueRequest(() =>
          this.getNextConnection().getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          }),
        );
      } catch (error: any) {
        lastError = error;
        if (error.message.includes('429') && attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1); // Экспоненциальная задержка
          console.log(`Rate limit hit. Retrying after ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  public async removeSubscription() {
    if (this.subscriptionId) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
        console.log('Subscription removed:', this.subscriptionId);
        this.subscriptionId = undefined;
      } catch (error) {
        console.error('Error removing subscription:', error);
      }
    }
  }

  private isNotPumpAddress(pubkey: string): string | void {
    if (!this.isPumpAddress(pubkey)) {
      return pubkey;
    }
  }

  private isPumpAddress(pubkey: string): boolean {
    const normalizedAddress = pubkey.toLowerCase();
    return normalizedAddress.endsWith('pump');
  }

  private compiledInstructionToTransaction(
    instruction: CompiledInstruction,
    staticAccountKeys: PublicKey[],
  ): TransactionInstruction {
    return {
      programId: staticAccountKeys[instruction.programIdIndex],
      keys: instruction.accounts.map((index) => ({
        pubkey: staticAccountKeys[index],
        isSigner: false,
        isWritable: false,
      })),
      data: Buffer.from(instruction.data, 'base64'),
    };
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
}
