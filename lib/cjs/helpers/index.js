"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.condition2SQL = exports.schema2SQL = exports.doubleField = exports.longtextField = exports.varcharField = exports.intField = exports.primaryKey = exports.field = exports.getFieldSQL = exports.MySQLFieldType = void 0;
const lodash_1 = __importDefault(require("lodash"));
var MySQLFieldType;
(function (MySQLFieldType) {
    MySQLFieldType["INT"] = "int";
    MySQLFieldType["VARCHAR"] = "varchar";
    MySQLFieldType["LONGTEXT"] = "longtext";
    MySQLFieldType["DOUBLE"] = "double";
})(MySQLFieldType = exports.MySQLFieldType || (exports.MySQLFieldType = {}));
/**
 * @access private
 * @abstract according to field from schema, return MySQL field type
 * @param {*} field object
 * @returns MySQLFieldType string
 */
const _getType = (field) => {
    if (field.type === MySQLFieldType.INT) {
        return "int(11)";
    }
    else if (field.type === MySQLFieldType.VARCHAR) {
        return "varchar(255)";
    }
    else if (field.type == MySQLFieldType.LONGTEXT) {
        return "longtext";
    }
    else if (field.type === MySQLFieldType.DOUBLE) {
        return "double";
    }
    return false;
};
/**
 * @access private
 * @abstract according to field from schema, return MySQL field default value
 * @param {*} field object
 * @returns MySQLFieldType default value
 */
const _getDefaultValue = (field) => {
    return field.primaryKey === true
        ? "NOT NULL AUTO_INCREMENT"
        : field.defaultValue
            ? `DEFAULT '${field.defaultValue}'`
            : `DEFAULT ${field.type === "int" || field.type === "double" ? "0" : "NULL"}`;
};
const _setIndexes = (indexes, field) => {
    if (field.primaryKey === true)
        indexes.primaryKey = field.name;
    if (field.index && field.index.length > 0) {
        indexes = lodash_1.default.reduce(field.index, (prev, f) => {
            let prevF = [];
            // check prev[f] is array
            if (prev && prev[f] && lodash_1.default.isArray(prev[f])) {
                prevF = prev[f];
            }
            prevF.push(field.name);
            prev[f] = lodash_1.default.uniq(prev[f]); // unique for the array
            return prev;
        }, indexes);
    }
    return indexes;
};
/**
 * @access public
 * @abstract prepare field sql command
 * @parma {*} field
 * @returns fieldSqlCommand
 */
const getFieldSQL = (field) => {
    let type, defaultValue;
    // get type statement
    type = _getType(field);
    // check type is not true
    if (!!!type) {
        console.error(`Database is not support the type of field \`${field.name}\` Type:  ${field.type} `);
        return false;
    }
    // get default value statement
    defaultValue = _getDefaultValue(field);
    // field.sqlcmd is for each fields sql command
    return `\`${field.name}\` ${type} ${defaultValue}`;
};
exports.getFieldSQL = getFieldSQL;
/**
 * @abstract define a field for table in database
 * @param {*} name
 * @param {*} type
 * @param {*} primaryKey boolean
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
const field = (name, type, primaryKey = false, defaultValue = null, index = null) => ({
    name,
    type,
    primaryKey,
    defaultValue,
    index,
});
exports.field = field;
/**
 * @abstract define primary key for table in database
 * @param {*} name
 * @returns fieldObject
 */
const primaryKey = (name) => (0, exports.field)(name, MySQLFieldType.INT, true, 0, [name]);
exports.primaryKey = primaryKey;
/**
 * @abstract define int field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
const intField = (name, defaultValue = 0, index) => (0, exports.field)(name, MySQLFieldType.INT, false, defaultValue, index);
exports.intField = intField;
/**
 * @abstract define varchar field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
const varcharField = (name, defaultValue = null, index = null) => (0, exports.field)(name, MySQLFieldType.VARCHAR, false, defaultValue, index);
exports.varcharField = varcharField;
/**
 * @abstract define longtext field for table in database
 * @param {*} name
 * @returns fieldObject
 */
const longtextField = (name) => (0, exports.field)(name, MySQLFieldType.LONGTEXT, false, null, null);
exports.longtextField = longtextField;
/**
 * @abstract define double field for table in database
 * @param {*} name
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
const doubleField = (name, defaultValue = 0, index = null) => (0, exports.field)(name, MySQLFieldType.DOUBLE, false, defaultValue, index);
exports.doubleField = doubleField;
const schema2SQL = (tableName, schema) => {
    let indexes = { primaryKey: "" };
    //prepare schemaSQL
    let schemaSQL = lodash_1.default.map(schema, (curr) => {
        // prepare schemaSQL for each field
        curr.sqlcmd = (0, exports.getFieldSQL)(curr);
        // check curr.sqlcmd is not true
        if (!!!curr.sqlcmd) {
            curr.error = `Database is not support the type of field \`${curr.name}\` Type:  ${curr.type} `;
            return curr;
        }
        //prepare Indexes
        indexes = _setIndexes(indexes, curr);
        return curr;
    });
    const primaryKey = indexes.primaryKey;
    if (indexes?.primaryKey)
        delete indexes.primaryKey;
    // check schemaSQL has error
    if (lodash_1.default.some(schemaSQL, (curr) => !!curr.error)) {
        console.error("Schema error, please check Schema:", lodash_1.default.find(schemaSQL, (curr) => !!curr.error)?.error);
        return false;
    }
    const fieldText = lodash_1.default.map(schemaSQL, (curr) => curr.sqlcmd).join(",");
    const keyText = indexes && lodash_1.default.keys(indexes).length > 0
        ? "," +
            lodash_1.default.map(indexes, (values, key) => {
                if (!values)
                    return "";
                if (!lodash_1.default.isArray(values))
                    return "";
                return `KEY \`${key}\` (\`${values.join("`,`")}\`) USING BTREE`;
            }).join(",")
        : "";
    return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        ${fieldText},
        PRIMARY KEY (\`${primaryKey}\`)
        ${keyText}
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;`;
};
exports.schema2SQL = schema2SQL;
/**
 * @access private
 * @abstract get key with tableName.key
 * @param {*} tableName string
 * @param {*} key string
 * @param {*} as string
 * @returns string alias.key
 */
const _getKeyAlias = (tableName, key, asString = null) => {
    let str;
    // check key has . or () mean it has alias already
    if (/(\.|\(|\))/.test(key)) {
        str = key;
    }
    else {
        str = `\`${tableName}\`.\`${key}\``;
    }
    // check as is defined
    if (asString) {
        str += ` AS \`${asString}\``;
    }
    return str;
};
const _prepareWhere = ({ tableName, query, param = [], statement = "", }) => {
    if (!lodash_1.default.isPlainObject(query))
        return { param, statement };
    lodash_1.default.each(query, (value, key) => {
        if (statement !== "" && !/^\$(and|or)$/i.test(key)) {
            statement += " AND ";
        }
        // check $and | $or | $not
        if (/^\$(and|or|not)$/i.test(key)) {
            const m = /^\$(and|or|not)$/i.exec(key);
            if (m && m[1]) {
                statement += ` ${m[1].toUpperCase()} (`;
                let { param: p, statement: s } = _prepareWhere({
                    tableName,
                    query: value,
                });
                param = [...param, ...p];
                statement += s;
                statement += ")";
            }
            // check value is object
        }
        else if (lodash_1.default.isPlainObject(value)) {
            let i = 0;
            lodash_1.default.each(value, (v, k) => {
                if (i++ > 0)
                    statement += " AND ";
                if (k === "eq")
                    statement += `${_getKeyAlias(tableName, key)} = ?`;
                if (k === "ne")
                    statement += `${_getKeyAlias(tableName, key)} <> ?`;
                if (k === "ge" || k === "gte")
                    statement += `${_getKeyAlias(tableName, key)} >= ?`;
                if (k === "gt")
                    statement += `${_getKeyAlias(tableName, key)} > ?`;
                if (k === "le" || k === "lte")
                    statement += `${_getKeyAlias(tableName, key)} <= ?`;
                if (k === "lt")
                    statement += `${_getKeyAlias(tableName, key)} < ?`;
                if (k === "like")
                    statement += `${_getKeyAlias(tableName, key)} like ?`;
                if (k === "like_before")
                    statement += `${_getKeyAlias(tableName, key)} like ?`;
                if (k === "like_after")
                    statement += `${_getKeyAlias(tableName, key)} like ?`;
                if (k === "like") {
                    param.push(`%${v}%`);
                }
                else if (k === "like_before") {
                    param.push(`${v}%`);
                }
                else if (k === "like_after") {
                    param.push(`%${v}`);
                }
                else {
                    param.push(v);
                }
            });
            // check value is array
        }
        else if (lodash_1.default.isArray(value)) {
            statement += ` ${_getKeyAlias(tableName, key)} IN (${lodash_1.default.map(value, () => "?").join(" , ")})`;
            param = lodash_1.default.reduce(value, (prev, v) => {
                prev.push(v);
                return prev;
            }, param);
        }
        else {
            statement += ` ${_getKeyAlias(tableName, key)} = ?`;
            param.push(value);
        }
    });
    return {
        statement,
        param,
    };
};
const _prepareGroup = ({ tableName, group_by, }) => {
    if (lodash_1.default.isArray(group_by)) {
        let statementArray;
        statementArray = lodash_1.default.reduce(group_by, (prev, g) => {
            const s = _prepareGroup({ tableName, group_by: g });
            prev.push(s.statement);
            return prev;
        }, []);
        return { statement: statementArray.join(",") };
    }
    let statement = _getKeyAlias(tableName, group_by);
    return { statement };
};
const _prepareOrder = ({ tableName, order_by, }) => {
    if (lodash_1.default.isArray(order_by)) {
        let statementArray;
        statementArray = lodash_1.default.reduce(order_by, (prev, order) => {
            const { statement } = _prepareOrder({ tableName, order_by: order });
            prev.push(statement);
            return prev;
        }, []);
        return { statement: statementArray.join(",") };
    }
    const { field, sort = "ASC" } = order_by;
    let statement = _getKeyAlias(tableName, field) + " " + sort;
    return { statement };
};
const _prepareJoin = ({ join }) => {
    let statement = lodash_1.default.reduce(join, (prev, relTable) => {
        prev += `${relTable.rel} JOIN \`${relTable.tableName}\` ON ${relTable.condition} `;
        return prev;
    }, "");
    return { statement };
};
const condition2SQL = (tableName, values) => {
    // get limit and offset
    let limit = {};
    if (values?.limit) {
        limit.limit = values.limit;
        delete values.limit;
    }
    if (values?.offset || values.offset === 0) {
        limit.offset = values.offset;
        delete values.offset;
    }
    // get group_by
    let group_by;
    if (values?.group_by) {
        group_by = values?.group_by;
        delete values.group_by;
    }
    // get order_by
    let order_by;
    if (values?.order_by) {
        order_by = values?.order_by;
        delete values.order_by;
    }
    // get field
    let field;
    if (values?.field) {
        field = values?.field;
        delete values.field;
    }
    // get sort
    let sort;
    if (values?.sort) {
        sort = values?.sort;
        delete values.sort;
    }
    if (field) {
        order_by = { field, sort };
    }
    // get join
    let join;
    if (values?.join) {
        join = values?.join;
        delete values.join;
    }
    // get select
    let select;
    if (values?.select) {
        select = values?.select;
        delete values.select;
    }
    // make sql statement
    let param = [];
    // set select
    let statement = `SELECT ${select ? select : "*"} FROM \`${tableName}\``;
    //set join
    if (join && join.length > 0) {
        const { statement: joinStatement } = _prepareJoin({ join });
        if (joinStatement && joinStatement.length > 0) {
            statement += ` ${joinStatement}`;
        }
    }
    // set where
    const { statement: whereStatement, param: whereParam } = _prepareWhere({
        tableName,
        query: values,
    });
    if (whereStatement && whereStatement.length > 0) {
        statement += ` WHERE ${whereStatement}`;
        param = [...param, ...whereParam];
    }
    // set group_by
    if (group_by) {
        const { statement: groupStatement } = _prepareGroup({
            tableName,
            group_by,
        });
        if (groupStatement && groupStatement.length > 0) {
            statement += ` GROUP BY ${groupStatement}`;
        }
    }
    // set order_by
    if (order_by) {
        const { statement: orderStatement } = _prepareOrder({
            tableName,
            order_by,
        });
        if (orderStatement && orderStatement.length > 0) {
            statement += ` ORDER BY ${orderStatement}`;
        }
    }
    // set limit
    if (limit && limit.limit) {
        statement += ` LIMIT ${limit.offset ? limit.offset : "0"} , ${limit.limit}`;
    }
    return { statement, param };
};
exports.condition2SQL = condition2SQL;
