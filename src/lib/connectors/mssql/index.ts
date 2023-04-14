import { ConnectionPool, ConnectionPoolConfig } from "mssql";
import { Connection } from "@/types";
import { Connector } from "..";

const systemDatabases = ["master", "tempdb", "model", "msdb"];

const getMSSQLConnection = async (connection: Connection): Promise<ConnectionPool> => {
  const connectionOptions: ConnectionPoolConfig = {
    server: connection.host,
    port: parseInt(connection.port),
    user: connection.username,
    password: connection.password,
    database: connection.database,
    options: {
      encrypt: connection.ssl?.enabled === true,
      trustServerCertificate: true,
    },
  };
  if (connection.ssl) {
    connectionOptions.ssl = {
      ca: connection.ssl?.ca,
      cert: connection.ssl?.cert,
      key: connection.ssl?.key,
      rejectUnauthorized: false,
    };
  }
  const pool = await new ConnectionPool(connectionOptions).connect();
  return pool;
};

const testConnection = async (connection: Connection): Promise<boolean> => {
  const pool = await getMSSQLConnection(connection);
  await pool.close();
  return true;
};

const execute = async (connection: Connection, databaseName: string, statement: string): Promise<any> => {
  const pool = await getMSSQLConnection(connection);
  const request = pool.request();
  const result = await request.query(`USE ${databaseName}; ${statement}`);
  await pool.close();
  return result.recordset;
};

const getDatabases = async (connection: Connection): Promise<string[]> => {
  const pool = await getMSSQLConnection(connection);
  const request = pool.request();
  const result = await request.query(`SELECT name FROM sys.databases WHERE name NOT IN ('${systemDatabases.join("','")}');`);
  await pool.close();
  const databaseList = [];
  for (const row of result.recordset) {
    if (row["name"]) {
      databaseList.push(row["name"]);
    }
  }
  return databaseList;
};

const getTables = async (connection: Connection, databaseName: string): Promise<string[]> => {
  const pool = await getMSSQLConnection(connection);
  const request = pool.request();
  const result = await request.query(
    `SELECT TABLE_NAME as table_name FROM ${databaseName}.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';`
  );
  await pool.close();
  const tableList = [];
  for (const row of result.recordset) {
    if (row["table_name"]) {
      tableList.push(row["table_name"]);
    }
  }
  return tableList;
};

const getTableStructure = async (connection: Connection, databaseName: string, tableName: string): Promise<string> => {
  const pool = await getMSSQLConnection(connection);
  const request = pool.request();
  const result = await request.query(`USE ${databaseName}; EXEC sp_help '${tableName}';`);
  await pool.close();
  if (result.recordset.length !== 1) {
    throw new Error("Unexpected number of rows.");
  }
  return result.recordset[0]["Create Table"] || "";
};

const newConnector = (connection: Connection): Connector => {
  return {
    testConnection: () => testConnection(connection),
    execute: (databaseName: string, statement: string) => execute(connection, databaseName, statement),
    getDatabases: () => getDatabases(connection),
    getTables: (databaseName: string) => getTables(connection, databaseName),
    getTableStructure: (databaseName: string, tableName: string) => getTableStructure(connection, databaseName, tableName),
  };
};

export default newConnector;
