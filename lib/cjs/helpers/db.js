"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldSQL = exports.schema2SQL = exports.doubleField = exports.longtextField = exports.varcharField = exports.intField = exports.primaryKey = exports.field = void 0;
const lodash_1 = __importDefault(require("lodash"));
/**
 * @abstract define a field for table in database
 * @param {*} name
 * @returns fieldObject
 */
const field = ({ name, type, primaryKey = false, defaultValue = null, index, }) => ({
    name,
    type,
    primaryKey,
    defaultValue,
    index,
});
exports.field = field;
/**
 * @abstract define primary key for table in database
 * @returns fieldObject
 */
const primaryKey = ({ name }) => (0, exports.field)({
    name,
    type: "int",
    primaryKey: true,
    defaultValue: 0,
    index: [name],
});
exports.primaryKey = primaryKey;
/**
 * @abstract define int field for table in database
 * @returns fieldObject
 */
const intField = ({ name, defaultValue = 0, index, }) => (0, exports.field)({ name, type: "int", defaultValue, index });
exports.intField = intField;
/**
 * @abstract define varchar field for table in database
 * @returns fieldObject
 */
const varcharField = ({ name, defaultValue = null, index, }) => (0, exports.field)({ name, type: "varchar", defaultValue, index });
exports.varcharField = varcharField;
/**
 * @abstract define longtext field for table in database
 * @param {*} name
 * @returns fieldObject
 */
const longtextField = ({ name }) => (0, exports.field)({ name, type: "longtext" });
exports.longtextField = longtextField;
/**
 * @abstract define double field for table in database
 * @returns fieldObject
 */
const doubleField = ({ name, defaultValue = 0, index, }) => (0, exports.field)({ name, type: "double", defaultValue, index });
exports.doubleField = doubleField;
/**
 * @access public
 * @abstract MySQL Schema become SQL command
 * @param tableName String
 * @param {*} schema mixed
 * @returns String SQLcommand
 */
const schema2SQL = (tableName, schema) => {
    let indexes = { primaryKey: "" };
    //prepare schemaSQL
    let schemaSQL = lodash_1.default.map(schema, (curr) => {
        // prepare schemaSQL for each field
        const sqlcmd = (0, exports.getFieldSQL)(curr);
        // check curr.sqlcmd is not true
        if (!!!sqlcmd) {
            return {
                ...curr,
                error: `Database is not support the type of field \`${curr.name}\` Type:  ${curr.type} `,
            };
        }
        //prepare Indexes
        indexes = _setIndexes(indexes, curr);
        return { ...curr, sqlcmd };
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
 * @abstract according to field from schema, return MySQL field type
 * @param {*} field object
 * @returns MySQLFieldType string
 */
const _getType = (field) => {
    if (field.type === "int") {
        return "int(11)";
    }
    else if (field.type === "varchar") {
        return "varchar(255)";
    }
    else if (field.type == "longtext") {
        return "longtext";
    }
    else if (field.type === "double") {
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
/**
 * @access private
 * @abstract prepare indexes according field
 * @param {*} indexes
 * @param {*} field
 * @returns indexes
 */
const _setIndexes = (indexes, field) => {
    if (field.primaryKey === true)
        indexes.primaryKey = field.name;
    if (!(field.index && field.index.length > 0))
        return indexes;
    return lodash_1.default.reduce(field.index, (prev, f) => {
        let prevF = [];
        // check prev[f] is array
        if (prev && prev[f] && lodash_1.default.isArray(prev[f])) {
            prevF = prev[f];
        }
        prevF.push(field.name);
        prev[f] = lodash_1.default.uniq(prev[f]); // unique for the array
        return prev;
    }, indexes);
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
