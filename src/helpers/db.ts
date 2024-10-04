import _ from "lodash";
import { MySQLField, MySQLFieldType, MySQLIndex, Schema } from "./types";

/**
 * @abstract define a field for table in database
 * @param {*} name
 * @returns fieldObject
 */
export const field = ({
  name,
  type,
  primaryKey = false,
  defaultValue = null,
  index,
}: {
  name: string;
  type: MySQLFieldType;
  primaryKey?: boolean;
  defaultValue?: string | number | null;
  index?: string[];
}): MySQLField => ({
  name,
  type,
  primaryKey,
  defaultValue,
  index,
});

/**
 * @abstract define primary key for table in database
 * @returns fieldObject
 */
export const primaryKey = ({ name }: { name: string }): MySQLField =>
  field({
    name,
    type: "int",
    primaryKey: true,
    defaultValue: 0,
    index: [name],
  });

/**
 * @abstract define int field for table in database
 * @returns fieldObject
 */

export const intField = ({
  name,
  defaultValue = 0,
  index,
}: {
  name: string;
  defaultValue?: number;
  index?: string[];
}): MySQLField => field({ name, type: "int", defaultValue, index });

/**
 * @abstract define varchar field for table in database
 * @returns fieldObject
 */
export const varcharField = ({
  name,
  defaultValue = null,
  index,
}: {
  name: string;
  defaultValue?: string | number | null;
  index?: string[];
}): MySQLField => field({ name, type: "varchar", defaultValue, index });

/**
 * @abstract define longtext field for table in database
 * @param {*} name
 * @returns fieldObject
 */
export const longtextField = ({ name }: { name: string }) =>
  field({ name, type: "longtext" });

/**
 * @abstract define double field for table in database
 * @returns fieldObject
 */
export const doubleField = ({
  name,
  defaultValue = 0,
  index,
}: {
  name: string;
  defaultValue: number;
  index?: string[];
}): MySQLField => field({ name, type: "double", defaultValue, index });

/**
 * @access public
 * @abstract MySQL Schema become SQL command
 * @param tableName String
 * @param {*} schema mixed
 * @returns String SQLcommand
 */
export const schema2SQL = (
  tableName: string,
  schema: Schema
): string | false => {
  let indexes: MySQLIndex = { primaryKey: "" };

  //prepare schemaSQL
  let schemaSQL: MySQLField[] = _.map(schema, (curr) => {
    // prepare schemaSQL for each field
    const sqlcmd = getFieldSQL(curr);

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
  if (indexes?.primaryKey) delete indexes.primaryKey;

  // check schemaSQL has error
  if (_.some(schemaSQL, (curr) => !!curr.error)) {
    console.error(
      "Schema error, please check Schema:",
      _.find(schemaSQL, (curr) => !!curr.error)?.error
    );
    return false;
  }

  const fieldText = _.map(schemaSQL, (curr) => curr.sqlcmd).join(",");
  const keyText =
    indexes && _.keys(indexes).length > 0
      ? "," +
        _.map(indexes, (values, key) => {
          if (!values) return "";
          if (!_.isArray(values)) return "";
          return `KEY \`${key}\` (\`${values.join("`,`")}\`) USING BTREE`;
        }).join(",")
      : "";
  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        ${fieldText},
        PRIMARY KEY (\`${primaryKey}\`)
        ${keyText}
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;`;
};

/**
 * @access private
 * @abstract according to field from schema, return MySQL field type
 * @param {*} field object
 * @returns MySQLFieldType string
 */
const _getType = (field: MySQLField): string | false => {
  if (field.type === "int") {
    return "int(11)";
  } else if (field.type === "varchar") {
    return "varchar(255)";
  } else if (field.type == "longtext") {
    return "longtext";
  } else if (field.type === "double") {
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
const _getDefaultValue = (field: MySQLField): string => {
  return field.primaryKey === true
    ? "NOT NULL AUTO_INCREMENT"
    : field.defaultValue
    ? `DEFAULT '${field.defaultValue}'`
    : `DEFAULT ${
        field.type === "int" || field.type === "double" ? "0" : "NULL"
      }`;
};

/**
 * @access private
 * @abstract prepare indexes according field
 * @param {*} indexes
 * @param {*} field
 * @returns indexes
 */

const _setIndexes = (indexes: MySQLIndex, field: MySQLField): MySQLIndex => {
  if (field.primaryKey === true) indexes.primaryKey = field.name;
  if (!(field.index && field.index.length > 0)) return indexes;
  return _.reduce(
    field.index,
    (prev, f) => {
      let prevF: string[] = [];
      // check prev[f] is array
      if (prev && prev[f] && _.isArray(prev[f])) {
        prevF = prev[f] as string[];
      }
      prevF.push(field.name);
      prev[f] = _.uniq(prev[f]); // unique for the array
      return prev;
    },
    indexes
  );
};

/**
 * @access public
 * @abstract prepare field sql command
 * @parma {*} field
 * @returns fieldSqlCommand
 */
export const getFieldSQL = (field: MySQLField): string | false => {
  let type, defaultValue;

  // get type statement
  type = _getType(field);
  // check type is not true
  if (!!!type) {
    console.error(
      `Database is not support the type of field \`${field.name}\` Type:  ${field.type} `
    );
    return false;
  }
  // get default value statement
  defaultValue = _getDefaultValue(field);

  // field.sqlcmd is for each fields sql command
  return `\`${field.name}\` ${type} ${defaultValue}`;
};
