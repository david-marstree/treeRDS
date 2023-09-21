export type MySQLField = {
    name: string;
    type: MySQLFieldType;
    primaryKey?: boolean;
    defaultValue?: any;
    index?: string[];
    sqlcmd?: string | false;
    error?: string;
};
export declare enum MySQLFieldType {
    INT = "int",
    VARCHAR = "varchar",
    LONGTEXT = "longtext",
    DOUBLE = "double"
}
/**
 * @access private
 * @abstract prepare indexes according field
 * @param {*} indexes
 * @param {*} field
 * @returns indexes
 */
export type MySQLIndex = {
    primaryKey?: string;
    [key: string]: string[] | string | undefined;
};
/**
 * @access public
 * @abstract prepare field sql command
 * @parma {*} field
 * @returns fieldSqlCommand
 */
export declare const getFieldSQL: (field: MySQLField) => string | false;
/**
 * @abstract define a field for table in database
 * @param {*} name
 * @param {*} type
 * @param {*} primaryKey boolean
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
export declare const field: (name: string, type: MySQLFieldType, primaryKey?: boolean, defaultValue?: any, index?: any) => MySQLField;
/**
 * @abstract define primary key for table in database
 * @param {*} name
 * @returns fieldObject
 */
export declare const primaryKey: (name: string) => MySQLField;
/**
 * @abstract define int field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
export declare const intField: (name: string, defaultValue: any, index: any) => MySQLField;
/**
 * @abstract define varchar field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
export declare const varcharField: (name: string, defaultValue?: any, index?: any) => MySQLField;
/**
 * @abstract define longtext field for table in database
 * @param {*} name
 * @returns fieldObject
 */
export declare const longtextField: (name: string) => MySQLField;
/**
 * @abstract define double field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
export declare const doubleField: (name: string, defaultValue?: any, index?: any) => MySQLField;
/**
 * @access public
 * @abstract MySQL Schema become SQL command
 * @param tableName String
 * @param {*} schema mixed
 * @returns String SQLcommand
 */
export type Schema = MySQLField[];
export declare const schema2SQL: (tableName: string, schema: Schema) => string | false;
/**
 * @access private
 * @abstract for prepare Where statement and param
 * @param {*} tableName string
 * @param {*} query object
 * @param {*} param array
 * @param {*} statement string
 * @returns param Parameters
 * @returns statement WHERE Statement
 */
export type WhereQuery = {
    [key: string]: any;
};
export type InsertData = WhereQuery;
export type UpdateData = WhereQuery;
export type PrepareWhereProps = {
    tableName: string;
    query: WhereQuery;
    param?: any;
    statement?: string;
};
export type ParepareWhereResult = {
    param: any[];
    statement: string;
};
/**
 * @access private
 * @abstract for prepare GROUP BY statement
 * @param {*} group_by mixed
 * @returns {*} statement Group statement
 */
export type PrepareGroupProps = {
    tableName: string;
    group_by: string[] | string;
};
export type PrepareGroupResult = {
    statement: string;
};
/**
 * @access private
 * @abstract for prepare ORDER BY statement
 * @param {*} order_by mixed
 * @returns {*} statement Group statement
 */
export type OrderBy = {
    field: string;
    sort?: "ASC" | "DESC" | "asc" | "desc";
};
export type PrepareOrderProps = {
    tableName: string;
    order_by: OrderBy[] | OrderBy;
};
export type PrepareOrderResult = {
    statement: string;
};
/**
 * @access private
 * @param {*} join
 * @returns {*} statement JOIN statement
 */
export type Join = {
    rel: "LEFT" | "INNER";
    tableName: string;
    condition: string;
};
export type PrepareJoinProps = {
    join: Join[];
};
export type PrepareJoinResult = {
    statement: string;
};
/**
 * @access public
 * @abstract MySQL condition function to select SQL statement
 * @param {*} tableName string
 * @param {*} values object
 * @returns {*} statement SQLCommand
 * @returns {*} param SQLParameters
 */
export type ConditionValues = {
    limit?: number;
    offset?: number;
    group_by?: string[] | string;
    order_by?: OrderBy[] | OrderBy;
    field?: string;
    sort?: "ASC" | "DESC" | "asc" | "desc";
    join?: Join[];
    select?: string;
    _getTotal?: boolean;
    [key: string]: any;
};
export type ConditionLimit = {
    limit?: number;
    offset?: number;
};
export type ConditonGroupBy = {};
export declare const condition2SQL: (tableName: string, values: ConditionValues) => {
    statement: string;
    param: string[];
};
//# sourceMappingURL=index.d.ts.map