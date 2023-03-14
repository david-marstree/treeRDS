const _ = require('lodash');
const mysql = require('mysql2/promise');
const moment = require("moment-timezone");

const { schema2SQL, getFieldSQL, condition2SQL } = require('./helpers');

/**
 * @access public
 * @abstract create connection to MySQL
 * @param {*} config config for database connection
 * @returns MySQLConnection conn
 */
const connect = async (config = {
    host: '',
    user: '',
    password: '',
    database: 'mysql',
    port: 3306,
    ssl: 'Amazon RDS',
    authPlugins: null
}) => {
    let conn = await mysql.createConnection(config);
    if (conn.state === 'disconnected') {
        console.log('MySQL is not connected')
    }
    return conn
}



/**
 * @access public
 * @abstract end connection to MySQL
 * @param {*} config config for database connection
 * @returns void
 */
const disconnect = async (conn) => {
    await conn.end();
}



/**
 * @access public
 * @abstract create database in MySQL
 * @param {*} conn MySQLConnection
 * @param {*} databaseName string
 * @returns {result: {rows, fields} }
 */
const createDatabase = async (conn, databaseName) => {
    try {
        // created database if it is not exists
        const [rows, fields] = await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8 COLLATE utf8_general_ci;`);
        return {
            result: { rows, fields }
        }
    } catch (error) {
        console.log(error);
        return { error }
    }

}



/**
 * @access public
 * @abstract create table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} schema mixed
 * @returns {result: {rows, fields}} 
 */
const createTable = async (conn, tableName, schema) => {
    // create sql command
    const sqlcmd = schema2SQL(tableName, schema);
    try {
        // query database
        const [rows, fields] = await conn.execute(sqlcmd);

        return {
            result: { rows, fields }
        }
    } catch (error) {
        console.log(error);
        return { error }
    }

}



/**
 * @access public
 * @abstract alter table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} schema mixed
 * @returns {result: {rows, fields}}
 */
const alterTable = async (conn, tableName, schema) => {
    let addColumn = [];

    //for each field 
    const ps = _.map(schema, (field) => {
        return conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${field.name}'`);
    });
    const result = await Promise.all(ps);

    // check field is exist
    addColumn = _.reduce(result, (prev, [rows, fields], index) => {
        if (rows && rows.length > 0) return prev;
        // if field is not exist then alter table add column and add into array
        // Example SQL: ALTER TABLE `tableName` ADD COLUMN email VARCHAR(100) NOT NULL
        const fieldSQL = getFieldSQL(schema[index]);
        const afterField = (index === 0) ? 'FIRST' : `AFTER \`${schema[(index - 1)].name}\``;
        const keyName = schema[index].index[0];
        prev.push(`ADD COLUMN ${fieldSQL}  ${afterField}, ADD KEY \`${keyName}\` (\`${schema[index].name}\`) USING BTREE`);
        return prev;
    }, addColumn);

    // check addColumn is empty
    if (addColumn.length === 0) return false;
    // finalize sqlcmd
    const sqlcmd = `ALTER TABLE \`${tableName}\` ${addColumn.join(",")}`

    try {
        // query database
        const [rows, fields] = await conn.execute(sqlcmd);
        return {
            result: { rows, fields }
        }
    } catch (error) {
        console.log(error);
        return { error }
    }

}



/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} array
 */
const get = async (conn, tableName, condition) => {
    // get sql command
    const conditionObj = condition2SQL(tableName, condition)
    const sqlcmd = conditionObj.statement;

    // query database
    try {
        // query database
        const [rows, fields] = await conn.query(sqlcmd, conditionObj.param);
        return rows;
    } catch (error) {
        console.log(error);
        return false;
    }
}



/**
 * @abstract select table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @returns {*} object
 */
const getOne = async (conn, tableName, condition) => {
    const result = await get(conn, tableName, { ...condition, limit: 1 });
    return (result) ? _.first(result) : result;
}



/**
 * @abstract select table in search Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
const getSearch = async (conn, tableName, condition) => {
    let { offset = 0, limit = 30, _getTotal = false, ...param } = condition;
    let result = { offset, limit };

    // get result.data
    result.data = await get(conn, tableName, {
        ...param,
        offset,
        limit
    });

    //get last_id
    result.last_id = (result.data && result.data.length > 0) ? _.last(result.data)?.id : null;

    // check is_more
    const isMoreResp = await get(conn, tableName, {
        ...param,
        offset: (+offset + +limit),
        limit: 1
    });
    result.is_more = (isMoreResp && isMoreResp.length > 0);

    //getTotal if need
    if (_getTotal !== false) {
        result.total = await count(conn, tableName, { param });
    }

    return result;
}

/**
 * @abstract get table increment code 
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} condition mixed
 * @return {*} {data, is_more, offset, limit, total}
 */
const generateCode = async (conn, tableName, condition, key = 'code', length = 4) => {
    // set Prefix and subfix default
    const prefix = (condition && condition[key] && condition[key]?.like_before) ? condition[key].like_before : moment((new Date()).getTime()).tz("Asia/Hong_Kong").format('YYMM');
    const subfix = (condition && condition[key] && condition[key]?.like_after) ? condition[key].like_after : undefined;

    // get Max Key current accroding conditon
    let query = {
        ...condition,
        field: key,
        sort: 'desc'
    };
    query[key] = { like_before: prefix };
    if (subfix) query[key].like_after = subfix;
    const prevResult = await getOne(conn, tableName, query);

    // define new code
    let code, increment = 0;
    // if prevResult exist
    if (prevResult && prevResult[key]) {
        const r = new RegExp("^" + prefix + "([0-9]+)" + (subfix ? subfix : '') + "$", i);
        const m = r.exec(prevResult[key]);
        increment = +m[1];
    }

    //check code is exists
    let check;
    do {
        increment += 1;
        code = prefix + String(increment).padStart(length, '0') + (subfix ? subfix : '');
        const checkQuery = {};
        checkQuery[key] = code;
        check = await getOne(conn, tableName, checkQuery);
    } while (check && check[key]);

    return code;

}


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

    const conditionObj = condition2SQL(tableName, {
        ...newCondition,
        select: `COUNT(*) as count`
    })
    const sqlcmd = conditionObj.statement;

    // query database
    try {
        // query database
        const [rows, fields] = await conn.query(sqlcmd, conditionObj.param);
        return rows[0].count;
    } catch (error) {
        console.log(error);
        return false;
    }
}



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
    if (!(values && _.isPlainObject(values) && !_.isEmpty(values))) {
        return {
            error: 'values is required'
        }
    }

    // filter values' key is not in schema
    const psCheckKeys = _
        .chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = _.map((await Promise.all(psCheckKeys)), ([rows]) => (rows && rows.length > 0));
    const schema = _.
        chain(values)
        .keys()
        .reduce((prev, key, index) => {
            if (checkKeysArr[index] === true) prev.push(key);
            return prev;
        }, [])
        .value();

    let filterValues = _.reduce(values, (prev, values, key) => {
        if (!_.some(schema, (field) => field === key)) return prev;
        prev[key] = values;
        return prev;
    }, {});

    // add created_at if values is not exists 
    if (!filterValues?.created_at) {
        filterValues.created_at = moment((new Date()).getTime()).tz("Asia/Hong_Kong").format('X');
    }

    // find primary key and make sure filterValues[primaryKey] = 0;
    const [rows] = await conn.execute(`SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`);
    const primaryKey = _.first(rows)?.Column_name || 'id';
    filterValues[primaryKey] = (filterValues && filterValues[primaryKey]) ? filterValues[primaryKey] : 0;

    // make insert sql command
    const keys = _.keys(filterValues);
    const question = _.map(keys, () => '?').join(',');
    const finalValues = _.values(filterValues);
    const sqlcmd = `INSERT INTO \`${tableName}\`(\`${keys.join('\`,\`')}\`) VALUES(${question})`;

    // query database
    try {
        const [result, fields] = await conn.query(sqlcmd, finalValues);
        const { insertId } = result;
        return await getOne(conn, tableName, { id: insertId });
    } catch (error) {
        console.log(error);
        return false
    }

}



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
    if (!(multipleValues && _.isArray(multipleValues) && multipleValues.length > 0)) return false;
    // for each multipleValues and query add 
    const ps = _.map(multipleValues, (values) => add(conn, tableName, values));
    return await Promise.all(ps);
}



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
    if (!(conditions && _.isPlainObject(conditions) && !_.isEmpty(conditions))) {
        return {
            error: 'conditions is required'
        }
    }

    // check values is not empty
    if (!(values && _.isPlainObject(values) && !_.isEmpty(values))) {
        return {
            error: 'values is required'
        }
    }

    // filter values' key is not in schema
    const psCheckKeys = _
        .chain(values)
        .keys()
        .map((key) => conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`))
        .value();
    const checkKeysArr = _.map((await Promise.all(psCheckKeys)), ([rows]) => (rows && rows.length > 0));
    const schema = _
        .chain(values)
        .keys()
        .reduce((prev, key, index) => {
            if (checkKeysArr[index] === true) prev.push(key);
            return prev;
        }, [])
        .value();

    let filterValues = _.reduce(values, (prev, values, key) => {
        if (!_.some(schema, (field) => field === key)) return prev;
        prev[key] = values;
        return prev;
    }, {});

    // add updated_at if values is not exists 
    if (!filterValues?.updated_at) {
        filterValues.updated_at = moment((new Date()).getTime()).tz("Asia/Hong_Kong").format('X');
    }
    // get origin data
    const originList = await get(conn, tableName, conditions);

    // prepare sql for update 
    const conditionString = _
        .chain(conditions)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(' AND ');

    const setString = _
        .chain(filterValues)
        .keys()
        .map((key) => `\`${key}\` = ?`)
        .value()
        .join(', ');

    const finalValues = [
        ..._.values(filterValues),
        ..._.values(conditions)
    ];

    // make update sql command
    const sqlcmd = `UPDATE \`${tableName}\` SET ${setString} WHERE ${conditionString}`;

    try {
        // query database
        const [result, fields] = await conn.query(sqlcmd, finalValues);

        const ps = _.map(originList, (data) => getOne(conn, tableName, { id: data.id }));
        const resp = await Promise.all(ps);
        return resp;
    } catch (error) {
        console.log(error);
        return false
    }

}



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
    if (!(conditions && _.keys(conditions).length > 0)) return false;

    const conditionString = _
        .clain(conditions)
        .keys()
        .map(key => `\`${key}\` = ?`)
        .value()
        .join(' AND ');
    const finalValues = _.values(conditions);

    // make update sql command
    const sqlcmd = `DELETE FROM \`${tableName}\` WHERE ${conditionString}`;
    try {
        // query database
        const { affectedRows } = await conn.query(sqlcmd, finalValues);
        return affectedRows;
    } catch (error) {
        console.log(error);
        return false
    }
}


/**
 * @access public
 * @abstract begin a transaction
 * @param {*} conn MySQLConnection
 * @returns void 
 */
const transaction = async (conn) => {
    await conn.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await conn.beginTransaction();
}


/**
 * @access public
 * @abstract commit transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
const commit = async (conn) => {
    await conn.commit();
}


/**
 * @access public
 * @abstract rollback transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
const rollback = async (conn) => {
    await conn.rollback();
}


module.exports = {
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
    rollback
}