// Aplica las migraciones de un proyecto con base de datos (ADR 0029): db/migraciones/NNN-*.sql en orden, una vez cada una.
// Guarda lo aplicado en la tabla _guardian_migraciones (nombre + huella); si una aplicada cambió, falla sin tocar nada.
// Uso: node tools/db/migrar.ts [carpeta] [--revisar]
//   env: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_SSL=1 (TiDB Cloud exige TLS)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { checksum, planificar, type Aplicada } from "../../scripts/migraciones.ts";

const args = process.argv.slice(2);
const revisar = args.includes("--revisar");
const carpeta = args.find((a) => !a.startsWith("--")) ?? "db/migraciones";

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_SSL } = process.env;
if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) throw new Error("Faltan MYSQL_HOST, MYSQL_USER o MYSQL_DATABASE");

const archivos = readdirSync(carpeta).map((nombre) => ({ nombre, contenido: readFileSync(join(carpeta, nombre), "utf8") }));

const db = await mysql.createConnection({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT ?? 3306),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  multipleStatements: true, // una migración puede traer varias sentencias
  ssl: MYSQL_SSL === "1" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});

try {
  await db.query(`CREATE TABLE IF NOT EXISTS _guardian_migraciones (
    nombre VARCHAR(255) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const [filas] = await db.query("SELECT nombre, checksum FROM _guardian_migraciones");
  const plan = planificar(archivos, filas as Aplicada[]);

  if (plan.errores.length) {
    for (const e of plan.errores) console.error(`✗ ${e}`);
    process.exitCode = 1;
  } else if (!plan.pendientes.length) {
    console.log(`Base al día: ${(filas as Aplicada[]).length} migraciones aplicadas.`);
  } else if (revisar) {
    console.log(`Pendientes (no se aplican con --revisar): ${plan.pendientes.map((m) => m.nombre).join(", ")}`);
  } else {
    for (const m of plan.pendientes) {
      await db.query(m.contenido);
      await db.query("INSERT INTO _guardian_migraciones (nombre, checksum) VALUES (?, ?)", [m.nombre, checksum(m.contenido)]);
      console.log(`✓ ${m.nombre}`);
    }
  }
} finally {
  await db.end();
}
