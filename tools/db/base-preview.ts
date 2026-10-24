// Crea (vacía) o borra la base de preview de un PR (#282). Después de «crear», migrar.ts la llena.
// Uso: node tools/db/base-preview.ts crear|borrar <nombre>
//   env: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_SSL=1 (el usuario «preview», que solo puede
//   tocar bases <repo>_pr_*)
import mysql from "mysql2/promise";
import { sentencias } from "../../scripts/base-preview.ts";

const [accion, nombre] = process.argv.slice(2);
if (accion !== "crear" && accion !== "borrar") throw new Error("Uso: base-preview.ts crear|borrar <nombre>");
const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_SSL } = process.env;
if (!MYSQL_HOST || !MYSQL_USER) throw new Error("Faltan MYSQL_HOST o MYSQL_USER");

const db = await mysql.createConnection({
  host: MYSQL_HOST.trim(),
  port: Number(MYSQL_PORT?.trim() || 3306),
  user: MYSQL_USER.trim(),
  password: MYSQL_PASSWORD,
  ssl: MYSQL_SSL === "1" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});
try {
  for (const sql of sentencias(accion, nombre)) await db.query(sql);
  console.log(accion === "crear" ? `✓ ${nombre} creada vacía` : `✓ ${nombre} borrada`);
} finally {
  await db.end();
}
