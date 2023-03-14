const _ = require('lodash');

/**
 * @access private
 * @abstract according to field from schema, return MySQL field type
 * @param {*} field object
 * @returns MySQLFieldType string
 */
const _getType = (field) => {
    if (field.type === 'int') {
        return 'int(11)';
    } else if (field.type === 'varchar') {
        return 'varchar(255)';
    } else if (field.type == 'longtext') {
        return 'longtext';
    } else if (field.type === 'double') {
        return 'double';
    }
    return false
}



/**
 * @access private
 * @abstract according to field from schema, return MySQL field default value
 * @param {*} field object
 * @returns MySQLFieldType default value
 */
const _getDefaultValue = (field) => {
    return (field.primaryKey === true) ? 'NOT NULL AUTO_INCREMENT' : (field.defaultValue) ? `DEFAULT '${field.defaultValue}'` : `DEFAULT ${(field.type === 'int' || field.type === 'double') ? '0' : 'NULL'}`;
}



/**
 * @access private
 * @abstract prepare indexes according field
 * @param {*} indexes 
 * @param {*} field 
 * @returns indexes
 */
const _setIndexes = (indexes, field) => {
    if (field.primaryKey === true) indexes.primaryKey = field.name;
    if (field.index && field.index.length > 0) {
        indexes = _.reduce(field.index, (prev, f) => {
            // check prev[f] is array 
            if (!(prev && prev[f])) {
                prev[f] = [];
            }
            prev[f].push(field.name);
            prev[f] = _.uniq(prev[f]); // unique for the array
            return prev;
        }, indexes);
    }
    return indexes;
}



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
}

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
    index
});

exports.field = field;



/**
 * @abstract define primary key for table in database
 * @param {*} name 
 * @returns fieldObject
 */
exports.primaryKey = (name) => field(name, 'int', true, 0, [name]);



/**
 * @abstract define int field for table in database
 * @param {*} name 
 * @param {*} defaultValue 
 * @param {*} index 
 * @returns fieldObject
 */
exports.intField = (name, defaultValue = 0, index = null) => field(name, 'int', false, defaultValue, index);



/**
 * @abstract define varchar field for table in database
 * @param {*} name 
 * @param {*} defaultValue 
 * @param {*} index 
 * @returns fieldObject
 */
exports.varcharField = (name, defaultValue = null, index = null) => field(name, 'varchar', false, defaultValue, index);



/**
 * @abstract define longtext field for table in database
 * @param {*} name 
 * @returns fieldObject
 */
exports.longtextField = (name) => field(name, 'longtext', false, null, null);



/**
 * @abstract define double field for table in database
 * @param {*} name 
 * @param {*} defaultValue
 * @param {*} index
 * @returns fieldObject
 */
exports.doubleField = (name, defaultValue = 0, index = null) => field(name, 'double', false, defaultValue, index);



/**
 * @access public
 * @abstract MySQL Schema become SQL command
 * @param tableName String
 * @param {*} schema mixed
 * @returns String SQLcommand
 */
exports.schema2SQL = (tableName, schema) => {
    let indexes = { primaryKey: '' };

    //prepare schemaSQL
    let schemaSQL = _.map(schema, (curr) => {
        // prepare schemaSQL for each field
        curr.sqlcmd = getFieldSQL(curr);

        // check curr.sqlcmd is not true
        if (!!!curr.sqlcmd) {
            curr.error = `Database is not support the type of field \`${curr.name}\` Type:  ${curr.type} `;
            return curr;
        }

        //prepare Indexes
        indexes = _setIndexes(indexes, curr);

        return curr
    });
    const primaryKey = indexes.primaryKey;
    delete indexes.primaryKey;

    // check schemaSQL has error
    if (_.some(schemaSQL, (curr) => !!curr.error)) {
        console.error('Schema error, please check Schema:', _.find(schemaSQL, (curr) => !!curr.error).error);
        return false;
    }

    const fieldText = _.map(schemaSQL, (curr) => curr.sqlcmd).join(",");
    const keyText = (indexes && _.keys(indexes).length > 0) ? (
        "," + _.map(indexes, (values, key) => {
            return `KEY \`${key}\` (\`${values.join('`,`')}\`) USING BTREE`
        }).join(",")
    ) : "";
    return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        ${fieldText},
        PRIMARY KEY (\`${primaryKey}\`)
        ${keyText}
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;`
}



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
    } else {
        str = `\`${tableName}\`.\`${key}\``;
    }
    // check as is defined
    if (asString) {
        str += ` AS \`${asString}\``;
    }
    return str;
}



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
const _prepareWhere = ({ tableName, query, param = [], statement = '' }) => {
    if (!_.isPlainObject(query)) return { param, statement };

    _.each(query, (value, key) => {
        if (statement !== '' && !/^\$(and|or)$/i.test(key)) {
            statement += ' AND ';
        }

        // check $and | $or | $not
        if (/^\$(and|or|not)$/i.test(key)) {
            const m = /^\$(and|or|not)$/i.exec(key);
            statement += ` ${m[1].toUpperCase()} (`;
            let { param: p, statement: s } = _prepareWhere({
                tableName,
                query: value,
            });
            param = [...param, ...p];
            statement += s;
            statement += ')';

            // check value is object
        } else if (_.isPlainObject(value)) {
            let i = 0;
            _.each(value, (v, k) => {
                if (i++ > 0) statement += ' AND ';
                if (k === 'eq') statement += `${_getKeyAlias(tableName, key)} = ?`;
                if (k === 'ne') statement += `${_getKeyAlias(tableName, key)} <> ?`;
                if (k === 'ge' || k === 'gte') statement += `${_getKeyAlias(tableName, key)} >= ?`;
                if (k === 'gt') statement += `${_getKeyAlias(tableName, key)} > ?`;
                if (k === 'le' || k === 'lte') statement += `${_getKeyAlias(tableName, key)} <= ?`;
                if (k === 'lt') statement += `${_getKeyAlias(tableName, key)} < ?`;
                if (k === 'like') statement += `${_getKeyAlias(tableName, key)} like ?`;
                if (k === 'like_before') statement += `${_getKeyAlias(tableName, key)} like ?`;
                if (k === 'like_after') statement += `${_getKeyAlias(tableName, key)} like ?`;

                if (k === 'like') {
                    param.push(`%${v}%`);
                } else if (k === 'like_before') {
                    param.push(`${v}%`);
                } else if (k === 'like_after') {
                    param.push(`%${v}`);
                } else {
                    param.push(v);
                }
            });

            // check value is array
        } else if (_.isArray(value)) {
            statement += ` ${_getKeyAlias(tableName, key)} IN (${_.map(value, () => '?').join(' , ')})`;
            param = _.reduce(value, (prev, v) => {
                prev.push(v);
                return prev
            }, param);

        } else {
            statement += ` ${_getKeyAlias(tableName, key)} = ?`;
            param.push(value);
        }
    });

    return {
        statement,
        param
    }
}



/**
 * @access private
 * @abstract for prepare GROUP BY statement 
 * @param {*} group_by mixed
 * @returns {*} statement Group statement
 */
const _prepareGroup = ({ tableName, group_by }) => {
    if (!group_by) return { statement: false };
    if (_.isArray(group_by)) {
        let statementArray = _.map(group_by, (g) => {
            const { statement } = _prepareGroup({ tableName, group_by: g });
            return statement;
        });
        return { statement: statementArray.join(',') }
    }

    let statement = _getKeyAlias(tableName, group_by);
    return { statement }
}



/**
 * @access private
 * @abstract for prepare ORDER BY statement 
 * @param {*} order_by mixed
 * @returns {*} statement Group statement
 */
const _prepareOrder = ({ tableName, order_by }) => {
    if (!(order_by && _.isArray(order_by))) return { statement: false };
    if (_.isArray(order_by) && _.isArray(order_by[0])) {
        let statementArray = _.map(order_by, (order) => {
            const { statement } = _prepareOrder({ tableName, order_by: order });
            return statement;
        });
        return { statement: statementArray.join(',') }
    }

    const [field, sort = 'ASC'] = order_by;
    let statement = _getKeyAlias(tableName, field) + ' ' + sort;

    return { statement }
}


/**
 * @access private
 * @param {*} join 
 * @returns {*} statement JOIN statement
 */
const _prepareJoin = ({ join }) => {
    let statement = _.reduce(join, (prev, relTable) => {
        prev += `${relTable.rel} JOIN \`${relTable.tableName}\` ON ${relTable.condition} `;
        return prev;
    }, '');

    return { statement };
}



/**
 * @access public
 * @abstract MySQL condition function to select SQL statement
 * @param {*} tableName string
 * @param {*} values object
 * @returns {*} statement SQLCommand 
 * @returns {*} param SQLParameters 
 */
exports.condition2SQL = (tableName, values) => {
    // get limit and offset
    let limit = {}
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
        order_by = [field, sort];
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
    let statement = `SELECT ${(select) ? select : '*'} FROM \`${tableName}\``;

    //set join 
    const { statement: joinStatement } = _prepareJoin({ join });
    if (joinStatement && joinStatement.length > 0) {
        statement += ` ${joinStatement}`;
    }

    // set where
    const { statement: whereStatement, param: whereParam } = _prepareWhere({ tableName, query: values });
    if (whereStatement && whereStatement.length > 0) {
        statement += ` WHERE ${whereStatement}`;
        param = [...param, ...whereParam]
    }

    // set group_by
    const { statement: groupStatement } = _prepareGroup({ tableName, group_by });
    if (groupStatement && groupStatement.length > 0) {
        statement += ` GROUP BY ${groupStatement}`;
    }

    // set order_by
    const { statement: orderStatement } = _prepareOrder({ tableName, order_by });
    if (orderStatement && orderStatement.length > 0) {
        statement += ` ORDER BY ${orderStatement}`;
    }

    // set limit
    if (limit && limit.limit) {
        statement += ` LIMIT ${(limit.offset ? limit.offset : '0')} , ${limit.limit}`;
    }


    return { statement, param }
}
