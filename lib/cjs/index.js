"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollback = exports.commit = exports.transaction = exports.remove = exports.edit = exports.batchAdd = exports.add = exports.count = exports.generateCode = exports.getSearch = exports.getOne = exports.get = exports.alterTable = exports.createTable = exports.createDatabase = exports.disconnect = exports.connect = void 0;
const lodash_1 = __importDefault(require("lodash"));
const promise_1 = __importDefault(require("mysql2/promise"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const index_1 = require("./helpers/index");
const connect = async (config = {
    host: "",
    user: "",
    password: "",
    database: "mysql",
    port: 3306,
    ssl: "Amazon RDS",
}) => {
    try {
        const conn = await promise_1.default.createConnection(config);
        return conn;
    }
    catch (error) {
        console.log("MySQL Connection Error:", error);
        return;
    }
};
exports.connect = connect;
/**
 * @access public
 * @abstract end connection to MySQL
 * @param {*} config config for database connection
 * @returns void
 */
const disconnect = async (conn) => {
    await conn.end();
};
exports.disconnect = disconnect;
const createDatabase = async (conn, databaseName) => {
    try {
        // created database if it is not exists
        const [rows, fields] = await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8 COLLATE utf8_general_ci;`);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
};
exports.createDatabase = createDatabase;
const createTable = async (conn, tableName, schema) => {
    // create sql command
    const sqlcmd = (0, index_1.schema2SQL)(tableName, schema);
    if (sqlcmd === false)
        return { error: "Schema error" };
    try {
        // query database
        const [rows, fields] = await conn.execute(sqlcmd);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
};
exports.createTable = createTable;
const alterTable = async (conn, tableName, schema) => {
    let addColumn = [];
    //for each field
    const ps = lodash_1.default.map(schema, (field) => {
        return conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${field.name}'`);
    });
    const result = await Promise.all(ps);
    // check field is exist
    addColumn = lodash_1.default.reduce(result, (prev, [rows, fields], index) => {
        if (rows)
            return prev;
        // if field is not exist then alter table add column and add into array
        // Example SQL: ALTER TABLE `tableName` ADD COLUMN email VARCHAR(100) NOT NULL
        const fieldSQL = (0, index_1.getFieldSQL)(schema[index]);
        const afterField = index === 0 ? "FIRST" : `AFTER \`${schema[index - 1].name}\``;
        if (schema[index].index === undefined)
            return prev;
        // const keyName = schema[index].index[0];
        const keyName = schema[index].name;
        prev.push(`ADD COLUMN ${fieldSQL}  ${afterField}, ADD KEY \`${keyName}\` (\`${schema[index].name}\`) USING BTREE`);
        return prev;
    }, addColumn);
    // check addColumn is empty
    if (addColumn.length === 0)
        return { error: "Schema not Update" };
    // finalize sqlcmd
    const sqlcmd = `ALTER TABLE \`${tableName}\` ${addColumn.join(",")}`;
    try {
        // query database
        const [rows, fields] = await conn.execute(sqlcmd);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
};
exports.alterTable = alterTable;
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
const get = async (conn, tableName, condition) => {
    // get sql command
    const conditionObj = (0, index_1.condition2SQL)(tableName, condition);
    const sqlcmd = conditionObj.statement;
    // query database
    try {
        // query database
        console.info("sql cmd:", sqlcmd);
        const [rows] = await conn.query(sqlcmd, conditionObj.param);
        return rows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.get = get;
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} object
 */
const getOne = async (conn, tableName, condition) => {
    const result = await (0, exports.get)(conn, tableName, { ...condition, limit: 1 });
    return result && result.length > 0 ? result[0] : false;
};
exports.getOne = getOne;
const getSearch = async (conn, tableName, condition) => {
    let { offset = 0, limit = 30, _getTotal = false, ...param } = condition;
    // get result.data
    const data = await (0, exports.get)(conn, tableName, {
        ...param,
        offset,
        limit,
    });
    //get last_id
    let last_id = null;
    if (data && data.length > 0) {
        last_id = data[data.length - 1].id;
    }
    // check is_more
    const isMoreResp = await (0, exports.get)(conn, tableName, {
        ...param,
        offset: +offset + +limit,
        limit: 1,
    });
    const is_more = isMoreResp && isMoreResp.length > 0;
    //getTotal if need
    let total;
    if (_getTotal !== false) {
        total = await (0, exports.count)(conn, tableName, { param });
    }
    return {
        data,
        is_more,
        offset,
        limit,
        total,
        last_id,
    };
};
exports.getSearch = getSearch;
/**
 * @abstract get table increment code
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
const generateCode = async (conn, tableName, condition, key = "code", length = 4) => {
    // set Prefix and subfix default
    const prefix = condition && condition[key] && condition[key]?.like_before
        ? condition[key].like_before
        : (0, moment_timezone_1.default)(new Date().getTime()).tz("Asia/Hong_Kong").format("YYMM");
    const subfix = condition && condition[key] && condition[key]?.like_after
        ? condition[key].like_after
        : undefined;
    // get Max Key current accroding conditon
    let query = {
        ...condition,
        field: key,
        sort: "DESC",
    };
    query[key] = { like_before: prefix };
    if (subfix)
        query[key].like_after = subfix;
    const prevResult = await (0, exports.getOne)(conn, tableName, query);
    // define new code
    let code, increment = 0;
    // if prevResult exist
    if (prevResult && prevResult[key]) {
        const r = new RegExp("^" + prefix + "([0-9]+)" + (subfix ? subfix : "") + "$", "i");
        const m = r.exec(prevResult[key]);
        if (m && m[1]) {
            increment = +m[1];
        }
    }
    //check code is exists
    let check;
    do {
        increment += 1;
        code =
            prefix + String(increment).padStart(length, "0") + (subfix ? subfix : "");
        const checkQuery = {
            [key]: code,
        };
        check = await (0, exports.getOne)(conn, tableName, checkQuery);
    } while (check && check[key]);
    return code;
};
exports.generateCode = generateCode;
/**
 * @abstract count table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
const count = async (conn, tableName, condition) => {
    // count sql command
    let newCondition = condition;
    delete newCondition.limit;
    delete newCondition.offset;
    const conditionObj = (0, index_1.condition2SQL)(tableName, {
        ...newCondition,
        select: `COUNT(*) as count`,
    });
    const sqlcmd = conditionObj.statement;
    // query database
    try {
        // query database
        let [rows] = await conn.query(sqlcmd, conditionObj.param);
        rows = rows;
        return rows ? lodash_1.default.first(rows)?.count : rows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.count = count;
/**
 * @access public
 * @abstract insert value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
const add = async (conn, tableName, values) => {
    // check values is not empty
    if (!(values && lodash_1.default.isPlainObject(values) && !lodash_1.default.isEmpty(values))) {
        console.log('error: "values is required');
        return false;
    }
    // filter values' key is not in schema
    const psCheckKeys = lodash_1.default.chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = lodash_1.default.map(await Promise.all(psCheckKeys), ([rows]) => rows && rows.length > 0);
    const schema = lodash_1.default.chain(values)
        .keys()
        .reduce((prev, key, index) => {
        if (checkKeysArr[index] === true)
            prev.push(key);
        return prev;
    }, [])
        .value();
    let filterValues = lodash_1.default.reduce(values, (prev, values, key) => {
        if (!lodash_1.default.some(schema, (field) => field === key))
            return prev;
        prev[key] = values;
        return prev;
    }, {});
    // add created_at if values is not exists
    if (!filterValues?.created_at) {
        filterValues.created_at = (0, moment_timezone_1.default)(new Date().getTime())
            .tz("Asia/Hong_Kong")
            .format("X");
    }
    // find primary key and make sure filterValues[primaryKey] = 0;
    let [rows] = await conn.execute(`SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`);
    rows = rows;
    const primaryKey = lodash_1.default.first(rows)?.Column_name || "id";
    filterValues[primaryKey] =
        filterValues && filterValues[primaryKey] ? filterValues[primaryKey] : 0;
    // make insert sql command
    const keys = lodash_1.default.keys(filterValues);
    const question = lodash_1.default.map(keys, () => "?").join(",");
    const finalValues = lodash_1.default.values(filterValues);
    const sqlcmd = `INSERT INTO \`${tableName}\`(\`${keys.join("`,`")}\`) VALUES(${question})`;
    // query database
    try {
        const [result] = (await conn.query(sqlcmd, finalValues));
        const { insertId } = result;
        return await (0, exports.getOne)(conn, tableName, { id: insertId });
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.add = add;
/**
 * @access public
 * @abstract batch insert values into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} multipleValues array
 * @returns {result: {rows, fields}}
 */
const batchAdd = async (conn, tableName, multipleValues) => {
    // check multipleValues is array and not empty
    if (!(multipleValues && lodash_1.default.isArray(multipleValues) && multipleValues.length > 0))
        return false;
    // for each multipleValues and query add
    const ps = lodash_1.default.map(multipleValues, (values) => (0, exports.add)(conn, tableName, values));
    return await Promise.all(ps);
};
exports.batchAdd = batchAdd;
/**
 * @access public
 * @abstract update value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
const edit = async (conn, tableName, conditions, values) => {
    // check conditions is not empty
    if (!(conditions && lodash_1.default.isPlainObject(conditions) && !lodash_1.default.isEmpty(conditions))) {
        console.log("error: conditions is required");
        return false;
    }
    // check values is not empty
    if (!(values && lodash_1.default.isPlainObject(values) && !lodash_1.default.isEmpty(values))) {
        console.log("error: values is required");
        return false;
    }
    // filter values' key is not in schema
    const psCheckKeys = lodash_1.default.chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = lodash_1.default.map(await Promise.all(psCheckKeys), ([rows]) => rows && rows.length > 0);
    const schema = lodash_1.default.chain(values)
        .keys()
        .reduce((prev, key, index) => {
        if (checkKeysArr[index] === true)
            prev.push(key);
        return prev;
    }, [])
        .value();
    let filterValues = lodash_1.default.reduce(values, (prev, values, key) => {
        if (!lodash_1.default.some(schema, (field) => field === key))
            return prev;
        prev[key] = values;
        return prev;
    }, {});
    // add updated_at if values is not exists
    if (!filterValues?.updated_at) {
        filterValues.updated_at = (0, moment_timezone_1.default)(new Date().getTime())
            .tz("Asia/Hong_Kong")
            .format("X");
    }
    // get origin data
    const originList = (await (0, exports.get)(conn, tableName, conditions));
    // prepare sql for update
    const conditionString = lodash_1.default.chain(conditions)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(" AND ");
    const setString = lodash_1.default.chain(filterValues)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(", ");
    const finalValues = [...lodash_1.default.values(filterValues), ...lodash_1.default.values(conditions)];
    // make update sql command
    const sqlcmd = `UPDATE \`${tableName}\` SET ${setString} WHERE ${conditionString}`;
    try {
        // query database
        await conn.query(sqlcmd, finalValues);
        const ps = lodash_1.default.map(originList, (data) => (0, exports.getOne)(conn, tableName, { id: data.id }));
        const resp = await Promise.all(ps);
        return resp;
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.edit = edit;
/**
 * @access public
 * @abstract delete value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @returns {result: {rows, fields}}
 */
const remove = async (conn, tableName, conditions) => {
    // check empty condition forbiden delete all database data
    if (!(conditions && lodash_1.default.keys(conditions).length > 0))
        return false;
    const conditionString = lodash_1.default.chain(conditions)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(" AND ");
    const finalValues = lodash_1.default.values(conditions);
    // make update sql command
    const sqlcmd = `DELETE FROM \`${tableName}\` WHERE ${conditionString}`;
    try {
        // query database
        const [result] = (await conn.query(sqlcmd, finalValues));
        const { affectedRows } = result;
        return affectedRows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.remove = remove;
/**
 * @access public
 * @abstract begin a transaction
 * @param {*} conn MySQLConnection
 * @returns void
 */
const transaction = async (conn) => {
    await conn.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await conn.beginTransaction();
};
exports.transaction = transaction;
/**
 * @access public
 * @abstract commit transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
const commit = async (conn) => {
    await conn.commit();
};
exports.commit = commit;
/**
 * @access public
 * @abstract rollback transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
const rollback = async (conn) => {
    await conn.rollback();
};
exports.rollback = rollback;
exports.default = {
    connect: exports.connect,
    disconnect: exports.disconnect,
    createDatabase: exports.createDatabase,
    createTable: exports.createTable,
    alterTable: exports.alterTable,
    get: exports.get,
    generateCode: exports.generateCode,
    getSearch: exports.getSearch,
    count: exports.count,
    getOne: exports.getOne,
    add: exports.add,
    batchAdd: exports.batchAdd,
    edit: exports.edit,
    remove: exports.remove,
    transaction: exports.transaction,
    commit: exports.commit,
    rollback: exports.rollback,
};
