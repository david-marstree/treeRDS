import _ from "lodash";
import mysql, {
  Connection,
  ConnectionOptions,
  RowDataPacket,
  FieldPacket,
  ResultSetHeader,
} from "mysql2/promise";
import moment from "moment-timezone";

import {
  schema2SQL,
  getFieldSQL,
  condition2SQL,
  ConditionValues,
  InsertData,
  UpdateData,
} from "./helpers/index";
import type { Schema } from "./helpers/index";

/**
 * @access public
 * @abstract create connection to MySQL
 * @param {*} config config for database connection
 * @returns MySQLConnection conn
 */

export type ConnectProps = ConnectionOptions;

export const connect = async (
  config: ConnectProps = {
    host: "",
    user: "",
    password: "",
    database: "mysql",
    port: 3306,
    ssl: "Amazon RDS",
  }
): Promise<Connection | undefined> => {
  try {
    const conn: Connection = await mysql.createConnection(config);
    return conn;
  } catch (error) {
    console.log("MySQL Connection Error:", error);
    return;
  }
};

/**
 * @access public
 * @abstract end connection to MySQL
 * @returns void
 */
export const disconnect = async (conn: Connection) => {
  await conn.end();
};

/**
 * @access public
 * @abstract create database in MySQL
 * @returns {result: {rows, fields} }
 */

export type CreateDatabaseResult = {
  result?: {
    rows: RowDataPacket[];
    fields: FieldPacket[];
  };
  error?: any;
};

export const createDatabase = async ({
  conn,
  databaseName,
}: {
  conn: Connection;
  databaseName: string;
}): Promise<CreateDatabaseResult> => {
  try {
    // created database if it is not exists
    const [rows, fields]: [RowDataPacket[], FieldPacket[]] = await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8 COLLATE utf8_general_ci;`
    );
    return {
      result: { rows, fields },
    };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

/**
 * @access public
 * @abstract create table in Company Database
 * @returns {result: {rows, fields}}
 */

export type CreateTableResult = {
  result?: {
    rows: RowDataPacket[];
    fields: FieldPacket[];
  };
  error?: any;
};
export const createTable = async ({
  conn,
  tableName,
  schema,
}: {
  conn: Connection;
  tableName: string;
  schema: Schema;
}): Promise<CreateTableResult> => {
  // create sql command
  const sqlcmd = schema2SQL(tableName, schema);
  if (sqlcmd === false) return { error: "Schema error" };
  try {
    // query database
    const [rows, fields]: [RowDataPacket[], FieldPacket[]] = await conn.execute(
      sqlcmd
    );

    return {
      result: { rows, fields },
    };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

/**
 * @access public
 * @abstract alter table in Company Database
 * @returns {result: {rows, fields}}
 */
export type AlterTableResult = {
  result?: {
    rows: RowDataPacket[];
    fields: FieldPacket[];
  };
  error?: any;
};

export const alterTable = async ({
  conn,
  tableName,
  schema,
}: {
  conn: Connection;
  tableName: string;
  schema: Schema;
}): Promise<AlterTableResult> => {
  let addColumn: string[] = [];

  //for each field
  const ps = _.map(schema, (field) => {
    return conn.execute(
      `SHOW COLUMNS FROM \`${tableName}\` LIKE '${field.name}'`
    );
  });
  const result = await Promise.all(ps);

  // check field is exist
  addColumn = _.reduce(
    result,
    (prev, [rows, fields], index) => {
      if (rows) return prev;
      // if field is not exist then alter table add column and add into array
      // Example SQL: ALTER TABLE `tableName` ADD COLUMN email VARCHAR(100) NOT NULL
      const fieldSQL = getFieldSQL(schema[index]);
      const afterField =
        index === 0 ? "FIRST" : `AFTER \`${schema[index - 1].name}\``;
      if (schema[index].index === undefined) return prev;
      // const keyName = schema[index].index[0];
      const keyName = schema[index].name;
      prev.push(
        `ADD COLUMN ${fieldSQL}  ${afterField}, ADD KEY \`${keyName}\` (\`${schema[index].name}\`) USING BTREE`
      );
      return prev;
    },
    addColumn
  );

  // check addColumn is empty
  if (addColumn.length === 0) return { error: "Schema not Update" };
  // finalize sqlcmd
  const sqlcmd = `ALTER TABLE \`${tableName}\` ${addColumn.join(",")}`;

  try {
    // query database
    const [rows, fields]: [RowDataPacket[], FieldPacket[]] = await conn.execute(
      sqlcmd
    );
    return {
      result: { rows, fields },
    };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

/**
 * @abstract select table in Company Database
 * @returns {*} array
 */

export const get = async ({
  conn,
  tableName,
  condition = {},
}: {
  conn: Connection;
  tableName: string;
  condition?: ConditionValues;
}): Promise<RowDataPacket[] | false> => {
  // get sql command
  const conditionObj = condition2SQL(tableName, condition);
  const sqlcmd = conditionObj.statement;

  // query database
  try {
    // query database
    console.info("sql cmd:", sqlcmd);
    const [rows] = await conn.query(sqlcmd, conditionObj.param);
    return rows as RowDataPacket[];
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @abstract select table in Company Database
 * @returns {*} object
 */
export const getOne = async ({
  conn,
  tableName,
  condition = {},
}: {
  conn: Connection;
  tableName: string;
  condition?: ConditionValues;
}): Promise<RowDataPacket | false> => {
  const result = await get({
    conn,
    tableName,
    condition: { ...condition, limit: 1 },
  });
  return result && result.length > 0 ? result[0] : false;
};

/**
 * @abstract select table in search Database
 * @return {*} {data, is_more, offset, limit, total}
 */
export type GetSearchResult = {
  data: RowDataPacket[] | false;
  is_more: boolean;
  offset: number;
  limit: number;
  total?: number;
  last_id: number | string | null;
};
export const getSearch = async ({
  conn,
  tableName,
  condition = {},
}: {
  conn: Connection;
  tableName: string;
  condition?: ConditionValues;
}): Promise<GetSearchResult> => {
  let { offset = 0, limit = 30, _getTotal = false, ...param } = condition;
  // get result.data
  const data = await get({
    conn,
    tableName,
    condition: {
      ...param,
      offset,
      limit,
    },
  });

  //get last_id
  let last_id: string | number | null = null;
  if (data && data.length > 0) {
    last_id = data[data.length - 1].id;
  }

  // check is_more
  const isMoreResp = await get({
    conn,
    tableName,
    condition: {
      ...param,
      offset: +offset + +limit,
      limit: 1,
    },
  });
  const is_more = isMoreResp && isMoreResp.length > 0;

  //getTotal if need
  let total: number | undefined;
  if (_getTotal !== false) {
    total = await count({ conn, tableName, condition: { param } });
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

/**
 * @abstract get table increment code
 * @return {*} {data, is_more, offset, limit, total}
 */

export const generateCode = async ({
  conn,
  tableName,
  condition = {},
  key = "code",
  length = 4,
}: {
  conn: Connection;
  tableName: string;
  condition: ConditionValues;
  key?: string;
  length?: number;
}): Promise<string> => {
  // set Prefix and subfix default
  const prefix =
    condition && condition[key] && condition[key]?.like_before
      ? condition[key].like_before
      : moment(new Date().getTime()).tz("Asia/Hong_Kong").format("YYMM");
  const subfix =
    condition && condition[key] && condition[key]?.like_after
      ? condition[key].like_after
      : undefined;

  // get Max Key current accroding conditon
  let query: ConditionValues = {
    ...condition,
    field: key,
    sort: "DESC",
  };
  query[key] = { like_before: prefix };
  if (subfix) query[key].like_after = subfix;
  const prevResult = await getOne({ conn, tableName, condition: query });

  // define new code
  let code,
    increment = 0;
  // if prevResult exist
  if (prevResult && prevResult[key]) {
    const r = new RegExp(`^${prefix}([0-9]+)${subfix ? subfix : ""}$`, "i");
    const m = r.exec(prevResult[key]);
    if (m && m[1]) {
      increment = +m[1];
    }
  }

  //check code is exists
  let check;
  do {
    increment += 1;
    code = `${prefix}${String(increment).padStart(length, "0")}${
      subfix ? subfix : ""
    }`;
    const checkQuery: ConditionValues = {
      [key]: code,
    };
    check = await getOne({ conn, tableName, condition: checkQuery });
  } while (check && check[key]);

  return code;
};

/**
 * @abstract count table in Company Database
 * @returns {*} array
 */

export const count = async ({
  conn,
  tableName,
  condition = {},
}: {
  conn: Connection;
  tableName: string;
  condition?: ConditionValues;
}): Promise<any | false> => {
  // count sql command
  let newCondition = condition;
  delete newCondition.limit;
  delete newCondition.offset;

  const conditionObj = condition2SQL(tableName, {
    ...newCondition,
    select: `COUNT(*) as count`,
  });
  const sqlcmd = conditionObj.statement;

  // query database
  try {
    // query database
    let [rows] = await conn.query(sqlcmd, conditionObj.param);
    rows = rows as RowDataPacket[];

    return rows ? _.first(rows)?.count : rows;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @access public
 * @abstract insert value into table in Company Database
 * @returns {result: {rows, fields}}
 */
export const add = async ({
  conn,
  tableName,
  values,
}: {
  conn: Connection;
  tableName: string;
  values: InsertData;
}): Promise<RowDataPacket | false> => {
  // check values is not empty
  if (!(values && _.isPlainObject(values) && !_.isEmpty(values))) {
    console.log('error: "values is required');
    return false;
  }

  // filter values' key is not in schema
  const psCheckKeys = _.chain(values)
    .keys()
    .map((key) =>
      conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`)
    )
    .value();
  const checkKeysArr = _.map(
    await Promise.all(psCheckKeys),
    ([rows]: [RowDataPacket[]]) => rows && rows.length > 0
  );
  const schema = _.chain(values)
    .keys()
    .reduce((prev: string[], key, index) => {
      if (checkKeysArr[index] === true) prev.push(key);
      return prev;
    }, [])
    .value();

  let filterValues = _.reduce(
    values,
    (prev: any, values, key) => {
      if (!_.some(schema, (field) => field === key)) return prev;
      prev[key] = values;
      return prev;
    },
    {}
  );

  // add created_at if values is not exists
  if (!filterValues?.created_at) {
    filterValues.created_at = moment(new Date().getTime())
      .tz("Asia/Hong_Kong")
      .format("X");
  }

  // find primary key and make sure filterValues[primaryKey] = 0;
  let [rows] = await conn.execute(
    `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`
  );
  rows = rows as RowDataPacket[];
  const primaryKey = _.first(rows)?.Column_name || "id";
  filterValues[primaryKey] =
    filterValues && filterValues[primaryKey] ? filterValues[primaryKey] : 0;

  // make insert sql command
  const keys = _.keys(filterValues);
  const question = _.map(keys, () => "?").join(",");
  const finalValues = _.values(filterValues);
  const sqlcmd = `INSERT INTO \`${tableName}\`(\`${keys.join(
    "`,`"
  )}\`) VALUES(${question})`;

  // query database
  try {
    const [result] = (await conn.query(
      sqlcmd,
      finalValues
    )) as ResultSetHeader[];
    const { insertId } = result;
    return await getOne({
      conn,
      tableName,
      condition: {
        id: insertId,
      },
    });
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @access public
 * @abstract batch insert values into table in Company Database
 * @returns {result: {rows, fields}}
 */
export const batchAdd = async ({
  conn,
  tableName,
  multipleValues,
}: {
  conn: Connection;
  tableName: string;
  multipleValues: InsertData[];
}): Promise<(RowDataPacket | false)[] | false> => {
  // check multipleValues is array and not empty
  if (
    !(multipleValues && _.isArray(multipleValues) && multipleValues.length > 0)
  )
    return false;
  // for each multipleValues and query add
  const ps = _.map(multipleValues, (values) =>
    add({ conn, tableName, values })
  );
  return await Promise.all(ps);
};

/**
 * @access public
 * @abstract update value into table in Company Database
 * @returns {result: {rows, fields}}
 */
export const edit = async ({
  conn,
  tableName,
  condition,
  values,
}: {
  conn: Connection;
  tableName: string;
  condition: ConditionValues;
  values: UpdateData;
}): Promise<(RowDataPacket | false)[] | false> => {
  // check conditions is not empty
  if (!(condition && _.isPlainObject(condition) && !_.isEmpty(condition))) {
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
    .map((key) =>
      conn.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${key}'`)
    )
    .value();
  const checkKeysArr = _.map(
    await Promise.all(psCheckKeys),
    ([rows]: [RowDataPacket[]]) => rows && rows.length > 0
  );
  const schema = _.chain(values)
    .keys()
    .reduce((prev: string[], key, index) => {
      if (checkKeysArr[index] === true) prev.push(key);
      return prev;
    }, [])
    .value();

  let filterValues = _.reduce(
    values,
    (prev: any, values, key) => {
      if (!_.some(schema, (field) => field === key)) return prev;
      prev[key] = values;
      return prev;
    },
    {}
  );

  // add updated_at if values is not exists
  if (!filterValues?.updated_at) {
    filterValues.updated_at = moment(new Date().getTime())
      .tz("Asia/Hong_Kong")
      .format("X");
  }
  // get origin data
  const originList = (await get({
    conn,
    tableName,
    condition,
  })) as RowDataPacket[];

  // prepare sql for update
  const conditionString = _.chain(condition)
    .keys()
    .map((key) => `\`${key}\` = ?`)
    .value()
    .join(" AND ");

  const setString = _.chain(filterValues)
    .keys()
    .map((key) => `\`${key}\` = ?`)
    .value()
    .join(", ");

  const finalValues = [..._.values(filterValues), ..._.values(condition)];

  // make update sql command
  const sqlcmd = `UPDATE \`${tableName}\` SET ${setString} WHERE ${conditionString}`;

  try {
    // query database
    await conn.query(sqlcmd, finalValues);

    const ps = _.map(originList, (data) =>
      getOne({
        conn,
        tableName,
        condition: {
          id: data.id,
        },
      })
    );
    const resp = await Promise.all(ps);
    return resp;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @access public
 * @abstract delete value into table in Company Database
 * @param {*} conn MySQLConnection
 * @param {*} tableName string
 * @param {*} conditions object
 * @returns {result: {rows, fields}}
 */
export const remove = async (
  conn: Connection,
  tableName: string,
  conditions: ConditionValues
): Promise<number | false> => {
  // check empty condition forbiden delete all database data
  if (!(conditions && _.keys(conditions).length > 0)) return false;

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
    const [result] = (await conn.query(
      sqlcmd,
      finalValues
    )) as ResultSetHeader[];
    const { affectedRows } = result;
    return affectedRows;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * @access public
 * @abstract begin a transaction
 * @param {*} conn MySQLConnection
 * @returns void
 */
export const transaction = async (conn: Connection) => {
  await conn.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  await conn.beginTransaction();
};

/**
 * @access public
 * @abstract commit transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export const commit = async (conn: Connection) => {
  await conn.commit();
};

/**
 * @access public
 * @abstract rollback transaction
 * @params {*} conn MySQLConnection
 * @returns voids
 */
export const rollback = async (conn: Connection) => {
  await conn.rollback();
};

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
