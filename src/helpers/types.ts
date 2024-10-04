export type MySQLIndex = {
  primaryKey?: string;
  [key: string]: string[] | string | undefined;
};

export type MySQLFieldType = "int" | "varchar" | "longtext" | "double";

export type MySQLField = {
  name: string;
  type: "int" | "varchar" | "longtext" | "double";
  primaryKey?: boolean;
  defaultValue?: any;
  index?: string[];
  sqlcmd?: string | false;
  error?: string;
};

export type Schema = Omit<MySQLField, "sqlcmd" | "error">[];
