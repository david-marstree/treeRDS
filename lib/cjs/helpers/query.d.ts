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
    param?: string[];
    statement?: string;
};
export type ParepareWhereResult = {
    param: string[];
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
export type ConditionValues = Record<string, any> & {
    limit?: number;
    offset?: number;
    group_by?: string[] | string;
    order_by?: OrderBy[] | OrderBy;
    field?: string;
    sort?: "ASC" | "DESC" | "asc" | "desc";
    join?: Join[];
    select?: string;
    _getTotal?: boolean;
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
//# sourceMappingURL=query.d.ts.map