import _ from "lodash";
/**
 * @access private
 * @abstract get key with tableName.key
 * @param {*} tableName string
 * @param {*} key string
 * @param {*} asString string
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
    if (!_.isPlainObject(query))
        return { param, statement };
    _.each(query, (value, key) => {
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
        else if (_.isPlainObject(value)) {
            let i = 0;
            _.each(value, (v, k) => {
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
        else if (_.isArray(value)) {
            statement += ` ${_getKeyAlias(tableName, key)} IN (${_.map(value, () => "?").join(" , ")})`;
            param = _.reduce(value, (prev, v) => {
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
    if (_.isArray(group_by)) {
        let statementArray;
        statementArray = _.reduce(group_by, (prev, g) => {
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
    if (_.isArray(order_by)) {
        let statementArray;
        statementArray = _.reduce(order_by, (prev, order) => {
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
    let statement = _.reduce(join, (prev, relTable) => {
        prev += `${relTable.rel} JOIN \`${relTable.tableName}\` ON ${relTable.condition} `;
        return prev;
    }, "");
    return { statement };
};
export const condition2SQL = (tableName, values) => {
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
