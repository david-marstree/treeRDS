import mysql, { Connection, ConnectionOptions, RowDataPacket, FieldPacket } from "mysql2/promise";
import { ConditionValues, InsertData, UpdateData } from "./helpers/index";
import type { Schema } from "./helpers/index";
/**
 * @access public
 * @abstract create connection to MySQL
 * @param {*} config config for database connection
 * @returns MySQLConnection conn
 */
export type ConnectProps = ConnectionOptions;
export declare const connect: (config?: ConnectProps) => Promise<Connection | undefined>;
/**
 * @access public
 * @abstract end connection to MySQL
 * @param {*} config config for database connection
 * @returns void
 */
export declare const disconnect: (conn: Connection) => Promise<void>;
/**
 * @access public
 * @abstract create database in MySQL
 * @param {*} conn MySQLConnection
 * @param {*} databaseName string
 * @returns {result: {rows, fields} }
 */
export type CreateDatabaseResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const createDatabase: (conn: Connection, databaseName: string) => Promise<CreateDatabaseResult>;
/**
 * @access public
 * @abstract create table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} schema mixed
 * @returns {result: {rows, fields}}
 */
export type CreateTableResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const createTable: (conn: Connection, tableName: string, schema: Schema) => Promise<CreateTableResult>;
/**
 * @access public
 * @abstract alter table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} schema mixed
 * @returns {result: {rows, fields}}
 */
export type AlterTableResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const alterTable: (conn: Connection, tableName: string, schema: Schema) => Promise<AlterTableResult>;
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
export declare const get: (conn: Connection, tableName: string, condition: ConditionValues) => Promise<RowDataPacket[] | false>;
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} object
 */
export declare const getOne: (conn: Connection, tableName: string, condition: ConditionValues) => Promise<RowDataPacket | false>;
/**
 * @abstract select table in search Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
export type GetSearchResult = {
    data: RowDataPacket[] | false;
    is_more: boolean;
    offset: number;
    limit: number;
    total?: number;
    last_id: number | string | null;
};
export declare const getSearch: (conn: Connection, tableName: string, condition: ConditionValues) => Promise<GetSearchResult>;
/**
 * @abstract get table increment code
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
export declare const generateCode: (conn: Connection, tableName: string, condition: ConditionValues, key?: string, length?: number) => Promise<string>;
/**
 * @abstract count table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
export declare const count: (conn: Connection, tableName: string, condition: ConditionValues) => Promise<any | false>;
/**
 * @access public
 * @abstract insert value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
export declare const add: (conn: Connection, tableName: string, values: InsertData) => Promise<RowDataPacket | false>;
/**
 * @access public
 * @abstract batch insert values into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} multipleValues array
 * @returns {result: {rows, fields}}
 */
export declare const batchAdd: (conn: Connection, tableName: string, multipleValues: InsertData[]) => Promise<(RowDataPacket | false)[] | false>;
/**
 * @access public
 * @abstract update value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
export declare const edit: (conn: Connection, tableName: string, conditions: ConditionValues, values: UpdateData) => Promise<(RowDataPacket | false)[] | false>;
/**
 * @access public
 * @abstract delete value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @returns {result: {rows, fields}}
 */
export declare const remove: (conn: Connection, tableName: string, conditions: ConditionValues) => Promise<number | false>;
/**
 * @access public
 * @abstract begin a transaction
 * @param {*} conn MySQLConnection
 * @returns void
 */
export declare const transaction: (conn: Connection) => Promise<void>;
/**
 * @access public
 * @abstract commit transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export declare const commit: (conn: Connection) => Promise<void>;
/**
 * @access public
 * @abstract rollback transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export declare const rollback: (conn: Connection) => Promise<void>;
declare const _default: {
    connect: (config?: mysql.ConnectionOptions) => Promise<mysql.Connection | undefined>;
    disconnect: (conn: mysql.Connection) => Promise<void>;
    createDatabase: (conn: mysql.Connection, databaseName: string) => Promise<CreateDatabaseResult>;
    createTable: (conn: mysql.Connection, tableName: string, schema: Schema) => Promise<CreateTableResult>;
    alterTable: (conn: mysql.Connection, tableName: string, schema: Schema) => Promise<AlterTableResult>;
    get: (conn: mysql.Connection, tableName: string, condition: ConditionValues) => Promise<false | mysql.RowDataPacket[]>;
    generateCode: (conn: mysql.Connection, tableName: string, condition: ConditionValues, key?: string, length?: number) => Promise<string>;
    getSearch: (conn: mysql.Connection, tableName: string, condition: ConditionValues) => Promise<GetSearchResult>;
    count: (conn: mysql.Connection, tableName: string, condition: ConditionValues) => Promise<any>;
    getOne: (conn: mysql.Connection, tableName: string, condition: ConditionValues) => Promise<false | mysql.RowDataPacket>;
    add: (conn: mysql.Connection, tableName: string, values: import("./helpers/index").WhereQuery) => Promise<false | mysql.RowDataPacket>;
    batchAdd: (conn: mysql.Connection, tableName: string, multipleValues: import("./helpers/index").WhereQuery[]) => Promise<false | (false | mysql.RowDataPacket)[]>;
    edit: (conn: mysql.Connection, tableName: string, conditions: ConditionValues, values: import("./helpers/index").WhereQuery) => Promise<false | (false | mysql.RowDataPacket)[]>;
    remove: (conn: mysql.Connection, tableName: string, conditions: ConditionValues) => Promise<number | false>;
    transaction: (conn: mysql.Connection) => Promise<void>;
    commit: (conn: mysql.Connection) => Promise<void>;
    rollback: (conn: mysql.Connection) => Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map