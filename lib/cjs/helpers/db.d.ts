import { MySQLField, MySQLFieldType, Schema } from "./types";
/**
 * @abstract define a field for table in database
 * @param {*} name
 * @returns fieldObject
 */
export declare const field: ({ name, type, primaryKey, defaultValue, index, }: {
    name: string;
    type: MySQLFieldType;
    primaryKey?: boolean;
    defaultValue?: string | number | null;
    index?: string[];
}) => MySQLField;
/**
 * @abstract define primary key for table in database
 * @returns fieldObject
 */
export declare const primaryKey: ({ name }: {
    name: string;
}) => MySQLField;
/**
 * @abstract define int field for table in database
 * @returns fieldObject
 */
export declare const intField: ({ name, defaultValue, index, }: {
    name: string;
    defaultValue?: number;
    index?: string[];
}) => MySQLField;
/**
 * @abstract define varchar field for table in database
 * @returns fieldObject
 */
export declare const varcharField: ({ name, defaultValue, index, }: {
    name: string;
    defaultValue?: string | number | null;
    index?: string[];
}) => MySQLField;
/**
 * @abstract define longtext field for table in database
 * @param {*} name
 * @returns fieldObject
 */
export declare const longtextField: ({ name }: {
    name: string;
}) => MySQLField;
/**
 * @abstract define double field for table in database
 * @returns fieldObject
 */
export declare const doubleField: ({ name, defaultValue, index, }: {
    name: string;
    defaultValue: number;
    index?: string[];
}) => MySQLField;
/**
 * @access public
 * @abstract MySQL Schema become SQL command
 * @param tableName String
 * @param {*} schema mixed
 * @returns String SQLcommand
 */
export declare const schema2SQL: (tableName: string, schema: Schema) => string | false;
/**
 * @access public
 * @abstract prepare field sql command
 * @parma {*} field
 * @returns fieldSqlCommand
 */
export declare const getFieldSQL: (field: MySQLField) => string | false;
//# sourceMappingURL=db.d.ts.map