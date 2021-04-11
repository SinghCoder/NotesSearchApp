import * as Comlink from "comlink";
import wasmfile from "../sql.js/dist/sql-wasm-debug.wasm";
import initSqlJs from "../sql.js/dist/sql-wasm-debug.js";

type sqljs = typeof import("sql.js");
type Database = sqljs["Database"];
// https://gist.github.com/frankier/4bbc85f65ad3311ca5134fbc744db711
function initTransferHandlers(sql: sqljs) {
  Comlink.transferHandlers.set("WORKERSQLPROXIES", {
    canHandle: obj => {
      let isDB = obj instanceof sql.Database;
      let hasDB = obj.db && (obj.db instanceof sql.Database); // prepared statements
      return isDB||hasDB;
    },
    serialize(obj) {
      const { port1, port2 } = new MessageChannel();
      Comlink.expose(obj, port1);
      return [port2, [port2]];
    },
    deserialize: (port: MessagePort) => {
      port.start();
      return Comlink.wrap(port);
    }
  });
}

function stats(db: Database) {
  console.log(
    db.filename,"total bytes fetched:",
    db.lazyFile.totalFetchedBytes,
    "total requests:",
    db.lazyFile.totalRequests
);
}
const mod = {
  async new(url: string, chunkSize: number): Promise<Database> {
    const sql = await initSqlJs({
      locateFile: (_file: string) => wasmfile
    })
    initTransferHandlers(sql);
    const db = new sql.UrlDatabase(url, chunkSize);

    setInterval(() => stats(db), 10000);
    return db;
  }
}
export type SqliteMod = typeof mod;
Comlink.expose(mod)