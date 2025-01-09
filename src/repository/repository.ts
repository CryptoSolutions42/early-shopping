// import {
//   ColumnName,
//   InsertConfigType,
//   InsertExchangeAccountType,
//   InsertQueryParamType,
//   InsertTradeOperationType,
//   JoinTableType,
//   SelectQueryParamType,
//   UpdateQueryParamType,
//   ValueGenerationParamType,
//   ValueType,
//   WhereGenerationParamType,
// } from './types/types';
// import { DatabaseConnector } from 'utils/database/database';

// export class Repository extends DatabaseConnector {
//   constructor() {
//     super();
//   }

//   protected async _query<T>(query: string, ...args: (string | number)[]) {
//     const result = (await this._db.query(query, args)).rows as T[];

//     if (!result) {
//       return;
//     }
//     return result;
//   }

//   protected async _insertQuery({ tableName, value }: InsertQueryParamType) {
//     await this._query(
//       `
//         insert into ${tableName}(${this._insertColumnGeneration(value)})
//             values(${this._insertValuesGeneration(value)})
//         `,
//     );
//   }

//   protected async _updateQuery({ tableName, value, where, operationCondition }: UpdateQueryParamType) {
//     const whereString = this._whereChecker({ where, operationCondition });

//     await this._query(
//       `
//         update ${tableName}
//           set ${this._updateValueGeneration(value)}
//           ${whereString}
//         `,
//     );
//   }

//   protected async _selectQuery<T>({
//     tableName,
//     column,
//     where,
//     operationCondition,
//     join,
//   }: SelectQueryParamType): Promise<T[] | undefined> {
//     const joinString = this._joinChecker(join, tableName);
//     const whereString = this._whereChecker({ where, operationCondition });

//     const result = await this._query<T>(
//       `
//       select ${this._selectColumnGeneration(column)}
//       from ${tableName}
//       ${joinString + ' ' + whereString}
//       `,
//     );

//     return result;
//   }

//   protected _mappingValuesList(values: InsertConfigType | InsertExchangeAccountType | InsertTradeOperationType) {
//     return Object.keys(values).flatMap((name) => ({
//       column: ColumnName[name],
//       value: values[name],
//     }));
//   }

//   private _updateValueGeneration(value: ValueGenerationParamType[]) {
//     return value.flatMap((val) => `${val.column} = ${this._syntaxStringForSql(val.value)}`).join(', ');
//   }

//   private _whereGeneration(param: WhereGenerationParamType) {
//     if (!param.where) {
//       return ``;
//     }

//     return param.where
//       .flatMap((condition) => `${condition.column} = ${this._syntaxStringForSql(condition.value)}`)
//       .join(` ${param.operationCondition ?? ''} `);
//   }

//   private _whereChecker({ where, operationCondition }) {
//     if (!where) {
//       return ``;
//     }

//     return `where ${this._whereGeneration({ where, operationCondition })}`;
//   }

//   private _joinChecker(join: JoinTableType[] | undefined, tableName: string) {
//     if (!join) {
//       return ``;
//     }

//     return join
//       .flatMap(
//         (property: JoinTableType) =>
//           `${property.joinType} join ${property.joinTable} on ${tableName}.${property.conditionEqual[0]} = ${property.joinTable}.${property.conditionEqual[1]}`,
//       )
//       .join();
//   }

//   private _selectColumnGeneration(columns: string[]) {
//     return columns.length > 1 ? columns.join(', ') : columns[0];
//   }

//   private _insertColumnGeneration(value: ValueType[]) {
//     return value.flatMap((item) => item.column).join(', ');
//   }

//   private _insertValuesGeneration(value: ValueType[]) {
//     return value
//       .flatMap(
//         (item, index) =>
//           `${
//             typeof item.value === 'object' ? `'${JSON.stringify(item.value)}'` : this._syntaxStringForSql(item.value)
//           }`,
//       )
//       .join(', ');
//   }

//   private _syntaxStringForSql(value: string | number) {
//     return `${typeof value === 'string' ? `'${value}'` : value}`;
//   }
// }
