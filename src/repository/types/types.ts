// import { Order } from 'ccxt';
// import { ExchangeName } from '../types/types';

// export type TableNameType = 'trade_operation' | 'exchange_account' | 'order_book' | 'config';
// export type ValueType = {
//   column: string;
//   value: string | number;
// };
// type WhereType = ValueType;

// export type UpdateQueryParamType = {
//   tableName: TableNameType;
//   value: ValueType[];
//   where?: WhereType[];
//   operationCondition?: 'and' | 'or';
// };

// export type InsertQueryParamType = Pick<UpdateQueryParamType, 'tableName'> & {
//   value: ValueType[];
// };

// export type SelectQueryParamType = Pick<UpdateQueryParamType, 'tableName' | 'where' | 'operationCondition'> & {
//   column: string[];
//   join?: JoinTableType[];
// };
// export type JoinType = 'left' | 'right' | 'inner';
// export type JoinTableType = {
//   joinType: JoinType;
//   conditionEqual: [string, string];
//   joinTable: string;
// };

// export type WhereGenerationParamType = Pick<UpdateQueryParamType, 'operationCondition' | 'where'>;
// export type ValueGenerationParamType = ValueType;

// export type ConfigType = {
//   id: number;
//   priceTradingStart: number;
//   priceStep: number;
//   coinStep: number;
//   supply: number;
//   countStep: number;
//   percentGlassDepthUp: number;
//   countExchange: number;
//   symbol: string;
//   isStartTrading: boolean;
// };

// /**
//  * @description ExchangeAccountType - account exchange presentation
//  * @importantly dominance this field percent of dominance of exchange in the market.
//  * example: 1 == 100% dominance and 0.3 == 30% dominance
//  */
// export type ExchangeAccountType = {
//   id: number;
//   apiKey: string;
//   privateKey: string;
//   password: string;
//   isCex: boolean;
//   exchangeName: ExchangeName;
//   dominance: number;
// };

// export type TradeOperationType = {
//   id: number;
//   accountId: number;
//   typeOperation: TypeTradeOperationType;
//   timestamp: number;
//   price: number;
//   value: number;
// };
// type TypeTradeOperationType = 'buy' | 'sell';

// export type InsertConfigType = Omit<ConfigType, 'id'>;
// export type InsertTradeOperationType = Omit<TradeOperationType, 'id'>;
// export type InsertExchangeAccountType = Omit<ExchangeAccountType, 'id' | 'exchangeName'> & {
//   exchangeName: number;
// };

// export enum ColumnName {
//   // config
//   id = 'id',
//   priceTradingStart = 'price_trading_start',
//   priceStep = 'price_step',
//   coinStep = 'coin_step',
//   supply = 'supply',
//   countStep = 'count_step',
//   percentGlassDepthUp = 'percent_glass_depth_up',
//   countExchange = 'count_exchange',
//   isStartTrading = 'is_start_trading',
//   // exchange_account
//   apiKey = 'api_key',
//   privateKey = 'private_key',
//   password = 'password',
//   isCex = 'is_cex',
//   exchangeName = 'exchange_id',
//   // trade_operation
//   typeOperation = 'type_operation',
//   accountId = 'account_id',
//   price = 'price',
//   value = 'value',
//   timestamp = 'timestamp',
//   // order_book get fields from trade_operation and exchange_account
//   orderBook = 'order_book',
// }
