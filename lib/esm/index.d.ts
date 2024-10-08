import { Connection, ConnectionOptions, RowDataPacket, FieldPacket } from "mysql2/promise";
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
 * @returns void
 */
export declare const disconnect: (conn: Connection) => Promise<void>;
/**
 * @access public
 * @abstract create database in MySQL
 * @returns {result: {rows, fields} }
 */
export type CreateDatabaseResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const createDatabase: ({ conn, databaseName, }: {
    conn: Connection;
    databaseName: string;
}) => Promise<CreateDatabaseResult>;
/**
 * @access public
 * @abstract create table in Company Database
 * @returns {result: {rows, fields}}
 */
export type CreateTableResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const createTable: ({ conn, tableName, schema, }: {
    conn: Connection;
    tableName: string;
    schema: Schema;
}) => Promise<CreateTableResult>;
/**
 * @access public
 * @abstract alter table in Company Database
 * @returns {result: {rows, fields}}
 */
export type AlterTableResult = {
    result?: {
        rows: RowDataPacket[];
        fields: FieldPacket[];
    };
    error?: any;
};
export declare const alterTable: ({ conn, tableName, schema, }: {
    conn: Connection;
    tableName: string;
    schema: Schema;
}) => Promise<AlterTableResult>;
/**
 * @abstract select table in Company Database
 * @returns {*} array
 */
export declare const get: ({ conn, tableName, condition, }: {
    conn: Connection;
    tableName: string;
    condition?: ConditionValues;
}) => Promise<RowDataPacket[] | false>;
/**
 * @abstract select table in Company Database
 * @returns {*} object
 */
export declare const getOne: ({ conn, tableName, condition, }: {
    conn: Connection;
    tableName: string;
    condition?: ConditionValues;
}) => Promise<RowDataPacket | false>;
/**
 * @abstract select table in search Database
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
export declare const getSearch: ({ conn, tableName, condition, }: {
    conn: Connection;
    tableName: string;
    condition?: ConditionValues;
}) => Promise<GetSearchResult>;
/**
 * @abstract get table increment code
 * @return {*} {data, is_more, offset, limit, total}
 */
export declare const generateCode: ({ conn, tableName, condition, key, length, }: {
    conn: Connection;
    tableName: string;
    condition: ConditionValues;
    key?: string;
    length?: number;
}) => Promise<string>;
/**
 * @abstract count table in Company Database
 * @returns {*} array
 */
export declare const count: ({ conn, tableName, condition, }: {
    conn: Connection;
    tableName: string;
    condition?: ConditionValues;
}) => Promise<any | false>;
/**
 * @access public
 * @abstract insert value into table in Company Database
 * @returns {result: {rows, fields}}
 */
export declare const add: ({ conn, tableName, values, }: {
    conn: Connection;
    tableName: string;
    values: InsertData;
}) => Promise<RowDataPacket | false>;
/**
 * @access public
 * @abstract batch insert values into table in Company Database
 * @returns {result: {rows, fields}}
 */
export declare const batchAdd: ({ conn, tableName, multipleValues, }: {
    conn: Connection;
    tableName: string;
    multipleValues: InsertData[];
}) => Promise<(RowDataPacket | false)[] | false>;
/**
 * @access public
 * @abstract update value into table in Company Database
 * @returns {result: {rows, fields}}
 */
export declare const edit: ({ conn, tableName, condition, values, }: {
    conn: Connection;
    tableName: string;
    condition: ConditionValues;
    values: UpdateData;
}) => Promise<(RowDataPacket | false)[] | false>;
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
    connect: (config?: ConnectProps) => Promise<Connection | undefined>;
    disconnect: (conn: Connection) => Promise<void>;
    createDatabase: ({ conn, databaseName, }: {
        conn: Connection;
        databaseName: string;
    }) => Promise<CreateDatabaseResult>;
    createTable: ({ conn, tableName, schema, }: {
        conn: Connection;
        tableName: string;
        schema: Schema;
    }) => Promise<CreateTableResult>;
    alterTable: ({ conn, tableName, schema, }: {
        conn: Connection;
        tableName: string;
        schema: Schema;
    }) => Promise<AlterTableResult>;
    get: ({ conn, tableName, condition, }: {
        conn: Connection;
        tableName: string;
        condition?: ConditionValues;
    }) => Promise<RowDataPacket[] | false>;
    generateCode: ({ conn, tableName, condition, key, length, }: {
        conn: Connection;
        tableName: string;
        condition: ConditionValues;
        key?: string;
        length?: number;
    }) => Promise<string>;
    getSearch: ({ conn, tableName, condition, }: {
        conn: Connection;
        tableName: string;
        condition?: ConditionValues;
    }) => Promise<GetSearchResult>;
    count: ({ conn, tableName, condition, }: {
        conn: Connection;
        tableName: string;
        condition?: ConditionValues;
    }) => Promise<any | false>;
    getOne: ({ conn, tableName, condition, }: {
        conn: Connection;
        tableName: string;
        condition?: ConditionValues;
    }) => Promise<RowDataPacket | false>;
    add: ({ conn, tableName, values, }: {
        conn: Connection;
        tableName: string;
        values: InsertData;
    }) => Promise<RowDataPacket | false>;
    batchAdd: ({ conn, tableName, multipleValues, }: {
        conn: Connection;
        tableName: string;
        multipleValues: InsertData[];
    }) => Promise<(RowDataPacket | false)[] | false>;
    edit: ({ conn, tableName, condition, values, }: {
        conn: Connection;
        tableName: string;
        condition: ConditionValues;
        values: UpdateData;
    }) => Promise<(RowDataPacket | false)[] | false>;
    remove: (conn: Connection, tableName: string, conditions: ConditionValues) => Promise<number | false>;
    transaction: (conn: Connection) => Promise<void>;
    commit: (conn: Connection) => Promise<void>;
    rollback: (conn: Connection) => Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map