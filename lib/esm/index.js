var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import _ from "lodash";
import mysql from "mysql2/promise";
import moment from "moment-timezone";
import { schema2SQL, getFieldSQL, condition2SQL, } from "./helpers/index";
export const connect = (config = {
    host: "",
    user: "",
    password: "",
    database: "mysql",
    port: 3306,
    ssl: "Amazon RDS",
}) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conn = yield mysql.createConnection(config);
        return conn;
    }
    catch (error) {
        console.log("MySQL Connection Error:", error);
        return;
    }
});
/**
 * @access public
 * @abstract end connection to MySQL
 * @param {*} config config for database connection
 * @returns void
 */
export const disconnect = (conn) => __awaiter(void 0, void 0, void 0, function* () {
    yield conn.end();
});
export const createDatabase = (conn, databaseName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // created database if it is not exists
        const [rows, fields] = yield conn.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8 COLLATE utf8_general_ci;`);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
});
export const createTable = (conn, tableName, schema) => __awaiter(void 0, void 0, void 0, function* () {
    // create sql command
    const sqlcmd = schema2SQL(tableName, schema);
    if (sqlcmd === false)
        return { error: "Schema error" };
    try {
        // query database
        const [rows, fields] = yield conn.execute(sqlcmd);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
});
export const alterTable = (conn, tableName, schema) => __awaiter(void 0, void 0, void 0, function* () {
    let addColumn = [];
    //for each field
    const ps = _.map(schema, (field) => {
        return conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${field.name}'`);
    });
    const result = yield Promise.all(ps);
    // check field is exist
    addColumn = _.reduce(result, (prev, [rows, fields], index) => {
        if (rows)
            return prev;
        // if field is not exist then alter table add column and add into array
        // Example SQL: ALTER TABLE `tableName` ADD COLUMN email VARCHAR(100) NOT NULL
        const fieldSQL = getFieldSQL(schema[index]);
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
        const [rows, fields] = yield conn.execute(sqlcmd);
        return {
            result: { rows, fields },
        };
    }
    catch (error) {
        console.log(error);
        return { error };
    }
});
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
export const get = (conn, tableName, condition) => __awaiter(void 0, void 0, void 0, function* () {
    // get sql command
    const conditionObj = condition2SQL(tableName, condition);
    const sqlcmd = conditionObj.statement;
    // query database
    try {
        // query database
        console.info("sql cmd:", sqlcmd);
        const [rows] = yield conn.query(sqlcmd, conditionObj.param);
        return rows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} object
 */
export const getOne = (conn, tableName, condition) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield get(conn, tableName, Object.assign(Object.assign({}, condition), { limit: 1 }));
    return result && result.length > 0 ? result[0] : false;
});
export const getSearch = (conn, tableName, condition) => __awaiter(void 0, void 0, void 0, function* () {
    let { offset = 0, limit = 30, _getTotal = false } = condition, param = __rest(condition, ["offset", "limit", "_getTotal"]);
    // get result.data
    const data = yield get(conn, tableName, Object.assign(Object.assign({}, param), { offset,
        limit }));
    //get last_id
    let last_id = null;
    if (data && data.length > 0) {
        last_id = data[data.length - 1].id;
    }
    // check is_more
    const isMoreResp = yield get(conn, tableName, Object.assign(Object.assign({}, param), { offset: +offset + +limit, limit: 1 }));
    const is_more = isMoreResp && isMoreResp.length > 0;
    //getTotal if need
    let total;
    if (_getTotal !== false) {
        total = yield count(conn, tableName, { param });
    }
    return {
        data,
        is_more,
        offset,
        limit,
        total,
        last_id,
    };
});
/**
 * @abstract get table increment code
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
export const generateCode = (conn, tableName, condition, key = "code", length = 4) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // set Prefix and subfix default
    const prefix = condition && condition[key] && ((_a = condition[key]) === null || _a === void 0 ? void 0 : _a.like_before)
        ? condition[key].like_before
        : moment(new Date().getTime()).tz("Asia/Hong_Kong").format("YYMM");
    const subfix = condition && condition[key] && ((_b = condition[key]) === null || _b === void 0 ? void 0 : _b.like_after)
        ? condition[key].like_after
        : undefined;
    // get Max Key current accroding conditon
    let query = Object.assign(Object.assign({}, condition), { field: key, sort: "DESC" });
    query[key] = { like_before: prefix };
    if (subfix)
        query[key].like_after = subfix;
    const prevResult = yield getOne(conn, tableName, query);
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
        check = yield getOne(conn, tableName, checkQuery);
    } while (check && check[key]);
    return code;
});
/**
 * @abstract count table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
export const count = (conn, tableName, condition) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    // count sql command
    let newCondition = condition;
    delete newCondition.limit;
    delete newCondition.offset;
    const conditionObj = condition2SQL(tableName, Object.assign(Object.assign({}, newCondition), { select: `COUNT(*) as count` }));
    const sqlcmd = conditionObj.statement;
    // query database
    try {
        // query database
        let [rows] = yield conn.query(sqlcmd, conditionObj.param);
        rows = rows;
        return rows ? (_c = _.first(rows)) === null || _c === void 0 ? void 0 : _c.count : rows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
/**
 * @access public
 * @abstract insert value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
export const add = (conn, tableName, values) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    // check values is not empty
    if (!(values && _.isPlainObject(values) && !_.isEmpty(values))) {
        console.log('error: "values is required');
        return false;
    }
    // filter values' key is not in schema
    const psCheckKeys = _.chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = _.map(yield Promise.all(psCheckKeys), ([rows]) => rows && rows.length > 0);
    const schema = _.chain(values)
        .keys()
        .reduce((prev, key, index) => {
        if (checkKeysArr[index] === true)
            prev.push(key);
        return prev;
    }, [])
        .value();
    let filterValues = _.reduce(values, (prev, values, key) => {
        if (!_.some(schema, (field) => field === key))
            return prev;
        prev[key] = values;
        return prev;
    }, {});
    // add created_at if values is not exists
    if (!(filterValues === null || filterValues === void 0 ? void 0 : filterValues.created_at)) {
        filterValues.created_at = moment(new Date().getTime())
            .tz("Asia/Hong_Kong")
            .format("X");
    }
    // find primary key and make sure filterValues[primaryKey] = 0;
    let [rows] = yield conn.execute(`SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`);
    rows = rows;
    const primaryKey = ((_d = _.first(rows)) === null || _d === void 0 ? void 0 : _d.Column_name) || "id";
    filterValues[primaryKey] =
        filterValues && filterValues[primaryKey] ? filterValues[primaryKey] : 0;
    // make insert sql command
    const keys = _.keys(filterValues);
    const question = _.map(keys, () => "?").join(",");
    const finalValues = _.values(filterValues);
    const sqlcmd = `INSERT INTO \`${tableName}\`(\`${keys.join("`,`")}\`) VALUES(${question})`;
    // query database
    try {
        const [result] = (yield conn.query(sqlcmd, finalValues));
        const { insertId } = result;
        return yield getOne(conn, tableName, { id: insertId });
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
/**
 * @access public
 * @abstract batch insert values into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} multipleValues array
 * @returns {result: {rows, fields}}
 */
export const batchAdd = (conn, tableName, multipleValues) => __awaiter(void 0, void 0, void 0, function* () {
    // check multipleValues is array and not empty
    if (!(multipleValues && _.isArray(multipleValues) && multipleValues.length > 0))
        return false;
    // for each multipleValues and query add
    const ps = _.map(multipleValues, (values) => add(conn, tableName, values));
    return yield Promise.all(ps);
});
/**
 * @access public
 * @abstract update value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @param {*} values object
 * @returns {result: {rows, fields}}
 */
export const edit = (conn, tableName, conditions, values) => __awaiter(void 0, void 0, void 0, function* () {
    // check conditions is not empty
    if (!(conditions && _.isPlainObject(conditions) && !_.isEmpty(conditions))) {
        console.log("error: conditions is required");
        return false;
    }
    // check values is not empty
    if (!(values && _.isPlainObject(values) && !_.isEmpty(values))) {
        console.log("error: values is required");
        return false;
    }
    // filter values' key is not in schema
    const psCheckKeys = _.chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = _.map(yield Promise.all(psCheckKeys), ([rows]) => rows && rows.length > 0);
    const schema = _.chain(values)
        .keys()
        .reduce((prev, key, index) => {
        if (checkKeysArr[index] === true)
            prev.push(key);
        return prev;
    }, [])
        .value();
    let filterValues = _.reduce(values, (prev, values, key) => {
        if (!_.some(schema, (field) => field === key))
            return prev;
        prev[key] = values;
        return prev;
    }, {});
    // add updated_at if values is not exists
    if (!(filterValues === null || filterValues === void 0 ? void 0 : filterValues.updated_at)) {
        filterValues.updated_at = moment(new Date().getTime())
            .tz("Asia/Hong_Kong")
            .format("X");
    }
    // get origin data
    const originList = (yield get(conn, tableName, conditions));
    // prepare sql for update
    const conditionString = _.chain(conditions)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(" AND ");
    const setString = _.chain(filterValues)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(", ");
    const finalValues = [..._.values(filterValues), ..._.values(conditions)];
    // make update sql command
    const sqlcmd = `UPDATE \`${tableName}\` SET ${setString} WHERE ${conditionString}`;
    try {
        // query database
        yield conn.query(sqlcmd, finalValues);
        const ps = _.map(originList, (data) => getOne(conn, tableName, { id: data.id }));
        const resp = yield Promise.all(ps);
        return resp;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
/**
 * @access public
 * @abstract delete value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @returns {result: {rows, fields}}
 */
export const remove = (conn, tableName, conditions) => __awaiter(void 0, void 0, void 0, function* () {
    // check empty condition forbiden delete all database data
    if (!(conditions && _.keys(conditions).length > 0))
        return false;
    const conditionString = _.chain(conditions)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(" AND ");
    const finalValues = _.values(conditions);
    // make update sql command
    const sqlcmd = `DELETE FROM \`${tableName}\` WHERE ${conditionString}`;
    try {
        // query database
        const [result] = (yield conn.query(sqlcmd, finalValues));
        const { affectedRows } = result;
        return affectedRows;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
/**
 * @access public
 * @abstract begin a transaction
 * @param {*} conn MySQLConnection
 * @returns void
 */
export const transaction = (conn) => __awaiter(void 0, void 0, void 0, function* () {
    yield conn.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    yield conn.beginTransaction();
});
/**
 * @access public
 * @abstract commit transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export const commit = (conn) => __awaiter(void 0, void 0, void 0, function* () {
    yield conn.commit();
});
/**
 * @access public
 * @abstract rollback transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export const rollback = (conn) => __awaiter(void 0, void 0, void 0, function* () {
    yield conn.rollback();
});
export default {
    connect,
    disconnect,
    createDatabase,
    createTable,
    alterTable,
    get,
    generateCode,
    getSearch,
    count,
    getOne,
    add,
    batchAdd,
    edit,
    remove,
    transaction,
    commit,
    rollback,
};
