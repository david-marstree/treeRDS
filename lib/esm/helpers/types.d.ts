export type MySQLIndex = {
    primaryKey?: string;
    [key: string]: string[] | string | undefined;
};
export declare enum MySQLFieldType {
    INT = "int",
    VARCHAR = "varchar",
    LONGTEXT = "longtext",
    DOUBLE = "double"
}
export type MySQLField = {
    name: string;
    type: MySQLFieldType;
    primaryKey?: boolean;
    defaultValue?: any;
    index?: string[];
    sqlcmd?: string | false;
    error?: string;
};
export type Schema = MySQLField[];
//# sourceMappingURL=types.d.ts.map