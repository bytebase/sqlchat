import axios from "axios";
import { uniqBy } from "lodash-es";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Connection, Database, Engine, ResponseObject, Table } from "@/types";
import { generateUUID } from "@/utils";
import { Schema } from "@/types";
import { stat } from "fs";

interface ConnectionContext {
  connection: Connection;
  database?: Database;
}

const samplePGConnection: Connection = {
  id: "sample-pg",
  title: "Sample PostgreSQL",
  engineType: Engine.PostgreSQL,
  host: "db.swxkyqvcefxcjecynews.supabase.co",
  port: "5432",
  username: "readonly_user",
  password: "sqlchat",
  database: "sample-employee",
};

interface ConnectionState {
  connectionList: Connection[];
  databaseList: Database[];
  currentConnectionCtx?: ConnectionContext;
  createConnection: (connection: Connection) => Connection;
  setCurrentConnectionCtx: (connectionCtx: ConnectionContext | undefined) => void;
  getOrFetchDatabaseList: (connection: Connection, skipCache?: boolean) => Promise<Database[]>;
  getOrFetchDatabaseSchema: (database: Database, skipCache?: boolean) => Promise<Schema[]>;
  getConnectionById: (connectionId: string) => Connection | undefined;
  updateConnection: (connectionId: string, connection: Partial<Connection>) => void;
  clearConnection: (filter: (connection: Connection) => boolean) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connectionList: [samplePGConnection],
      databaseList: [],
      createConnection: (connection: Connection) => {
        const createdConnection = {
          ...connection,
          id: generateUUID(),
        };
        set((state) => ({
          ...state,
          connectionList: [...state.connectionList, createdConnection],
        }));
        return createdConnection;
      },
      setCurrentConnectionCtx: (connectionCtx: ConnectionContext | undefined) =>
        set((state) => ({
          ...state,
          currentConnectionCtx: connectionCtx,
        })),
      getOrFetchDatabaseList: async (connection: Connection, skipCache = false) => {
        const state = get();

        if (!skipCache) {
          if (state.databaseList.some((database) => database.connectionId === connection.id)) {
            return state.databaseList.filter((database) => database.connectionId === connection.id);
          }
        }

        const { data } = await axios.post<string[]>("/api/connection/db", {
          connection,
        });

        const fetchedDatabaseList = data.map(
          (dbName) =>
            ({
              connectionId: connection.id,
              name: dbName,
              schemaList: [],
            } as Database)
        );
        const databaseList = uniqBy(
          [...fetchedDatabaseList, ...state.databaseList],
          (database) => `${database.connectionId}_${database.name}`
        );
        set((state) => ({
          ...state,
          databaseList,
        }));
        return databaseList.filter((database) => database.connectionId === connection.id);
      },
      getOrFetchDatabaseSchema: async (database: Database, skipCache = false) => {
        const state = get();

        if (!skipCache) {
          const db = state.databaseList.find((db) => db.connectionId === database.connectionId && db.name === database.name);
          if (db !== undefined && Array.isArray(db.schemaList) && db.schemaList.length !== 0) {
            return db.schemaList;
          }
        }

        const connection = state.connectionList.find((connection) => connection.id === database.connectionId);
        if (!connection) {
          return [];
        }

        const { data: result } = await axios.post<ResponseObject<Schema[]>>("/api/connection/db_schema", {
          connection,
          db: database.name,
        });

        if (result.message) {
          throw result.message;
        }

        const fetchedTableList: Schema[] = result.data;
        set((state) => ({
          ...state,
          databaseList: state.databaseList.map((item) =>
            item.connectionId === database.connectionId && item.name === database.name ? { ...item, schemaList: fetchedTableList } : item
          ),
        }));

        return fetchedTableList;
      },
      getConnectionById: (connectionId: string) => {
        return get().connectionList.find((connection) => connection.id === connectionId);
      },
      updateConnection: (connectionId: string, connection: Partial<Connection>) => {
        set((state) => ({
          ...state,
          connectionList: state.connectionList.map((item) => (item.id === connectionId ? { ...item, ...connection } : item)),
        }));
      },
      clearConnection: (filter: (connection: Connection) => boolean) => {
        set((state) => ({
          ...state,
          connectionList: state.connectionList.filter(filter),
        }));
      },
    }),
    {
      name: "connection-storage",
      version: 1,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState as ConnectionState;
        if (version === 0 || version === undefined) {
          // Migration from v0 to v1
          for (const connection of state.connectionList) {
            if (state.currentConnectionCtx?.database) {
              console.log("更新了", state.currentConnectionCtx?.database);
              state.getOrFetchDatabaseSchema(state.currentConnectionCtx?.database, true);
            }
          }
        }
        return state;
      },
    }
  )
);
