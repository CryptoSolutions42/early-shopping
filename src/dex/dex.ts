import axios from 'axios';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { Market, OpenOrders } from '@project-serum/serum';

import { ENV } from '../environment/const';
import { CreateOrderType, DexOrderType } from './types/types';

export class DexSwap {
  private _wallet: Wallet;
  private _connection: Connection;

  constructor() {
    this._connection = new Connection(ENV.SOLANA_MAINNET);
    this._wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(ENV.SOLANA_PRIVATE_KEY)));
  }

  protected async createLimitOrder(param: CreateOrderType): Promise<void> {
    try {
      const body = {
        ...param,
        maker: this._wallet.publicKey.toBase58(),
        payer: this._wallet.publicKey.toBase58(),
        computeUnitPrice: 'auto',
        wrapAndUnwrapSol: true,
      };

      const { data } = await axios.post(`${ENV.JUPITER_URL}/limit/v2/createOrder`, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const transaction = data.tx;
      await this._sendTransaction(transaction);

      console.log('Limit order created successfully!');
    } catch (error) {
      console.error('Error creating limit order:', error);
    }
  }

  protected async cancelAllOrders(maker: string): Promise<void> {
    try {
      const body = {
        maker,
        computeUnitPrice: 'auto',
      };

      const { data } = await axios.post(`${ENV.JUPITER_URL}/limit/v2/cancelOrders`, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      for (const tx of data.txs) {
        await this._sendTransaction(tx);
      }

      console.log('All orders cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling orders:', error);
    }
  }

  protected async getOpenOrders(): Promise<DexOrderType[]> {
    try {
      const url = `${ENV.JUPITER_URL}/limit/v2/openOrders?wallet=${this._wallet.publicKey}`;
      const { data } = await axios.get(url);
      return data;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return [];
    }
  }

  protected async executeSwap(inputMint: string, outputMint: string, amount: number, slippageBps = 50): Promise<void> {
    try {
      console.log('Getting quote...');
      const quoteResponse = await this._getQuote(inputMint, outputMint, amount, slippageBps);
      console.log('Quote received:', quoteResponse);
      console.log('Getting swap transaction...');
      const swapTransaction = await this._getSwapTransaction(quoteResponse);
      console.log('Sending transaction...');
      const txid = await this._sendTransaction(swapTransaction);
      console.log(`Swap completed successfully: ${txid}`);
    } catch (error) {
      console.error('Error during swap execution:', error);
    }
  }

  private async _getQuote(inputMint: string, outputMint: string, amount: number, slippageBps = 50) {
    const url = `${ENV.JUPITER_URL}/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

    const { data } = await axios.get(url);
    return data;
  }

  private async _getSwapTransaction(quoteResponse: any) {
    const body = {
      quoteResponse,
      userPublicKey: this._wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
    };

    const { data } = await axios.post(`${ENV.JUPITER_URL}/v6/swap`, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return data.swapTransaction;
  }

  private async _sendTransaction(transaction: string) {
    const transactionBuf = Buffer.from(transaction, 'base64');
    const deserializedTransaction = VersionedTransaction.deserialize(transactionBuf);

    deserializedTransaction.sign([this._wallet.payer]);

    const latestBlockHash = await this._connection.getLatestBlockhash();

    const rawTransaction = deserializedTransaction.serialize();
    const txid = await this._connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });

    await this._connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });

    console.log(`Transaction confirmed: https://solscan.io/tx/${txid}`);
    return txid;
  }

  //TODO: Реализовать переподключение к сети по разным rpc
  // private async initializeConnection() {
  //   let connected = false;
  //   while (!connected && this.currentEndpointIndex < SOLANA_RPC_ENDPOINTS.length) {
  //     try {
  //       this.connection = new Connection(SOLANA_RPC_ENDPOINTS[this.currentEndpointIndex]);
  //       await this.connection.getVersion();
  //       connected = true;
  //       console.log(`Connected to: ${SOLANA_RPC_ENDPOINTS[this.currentEndpointIndex]}`);
  //     } catch (error) {
  //       console.log(`Failed to connect to ${SOLANA_RPC_ENDPOINTS[this.currentEndpointIndex]}`);
  //       this.currentEndpointIndex++;
  //     }
  //   }

  //   if (!connected) {
  //     throw new Error('Failed to connect to any Solana RPC endpoint');
  //   }
  // }

  // private async switchEndpoint() {
  //   this.currentEndpointIndex = (this.currentEndpointIndex + 1) % SOLANA_RPC_ENDPOINTS.length;
  //   await this.initializeConnection();
  // }

  // protected async getTransactionWithRetry(signature: string, maxRetries = 3): Promise<any> {
  //   for (let i = 0; i < maxRetries; i++) {
  //     try {
  //       return await this.connection.getTransaction(signature, {
  //         maxSupportedTransactionVersion: 0,
  //       });
  //     } catch (error) {
  //       if (i === maxRetries - 1) throw error;
  //       await this.switchEndpoint();
  //     }
  //   }
  // }
}

// TODO: памятка для продолжения разработки бизнес логики торговли
// Пример использования В market-maker.ts
// const rpcUrl =
//   'https://neat-hidden-sanctuary.solana-mainnet.discover.quiknode.pro/2af5315d336f9ae920028bbb90a73b724dc1bbed/';
// const privateKey = '<your-private-key-here>'; // Здесь вставьте ваш закрытый ключ (не в продакшн коде)

// const jupiterSwap = new JupiterSwap(rpcUrl, privateKey);

// // Пример обмена 0.1 SOL на USDC с проскальзыванием 0.5%
// const inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint address
// const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint address
// const amount = 100000000; // 0.1 SOL (в лэмпортах)

// // Запуск свопа
// jupiterSwap.executeSwap(inputMint, outputMint, amount);

// Пример создания лимитного ордера
// const marketAddress = '<market-address>'; // Адрес рынка на Serum DEX
// const side = 'buy';  // 'buy' или 'sell'
// const price = 50;  // Цена за единицу
// const size = 100;  // Размер ордера в базовом токене
// const payerTokenAddress = '<payer-token-address>';  // Адрес токенов для оплаты
// const ownerKeypair = Keypair.fromSecretKey(bs58.decode('<owner-private-key>'));  // Ключ пользователя

// jupiterSwap.createLimitOrder(marketAddress, side, price, size, payerTokenAddress, ownerKeypair);
