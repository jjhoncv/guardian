// Cuando Claude empieza un ticket, el dueño lo ve: comentario con el link al run, etiqueta `en-curso` y, si el repo
// tiene PROJECT_TOKEN (permiso de proyectos), la tarjeta pasa a «En curso» en el tablero.
// Al terminar (#273), la tarjeta pasa a «En revisión» si abrió PR o vuelve a «Por hacer» si no.
// Uso (CI): node scripts/en-curso.ts <ticket> <url-del-run>      → comentario por stdout; tarjeta a «En curso»
//           node scripts/en-curso.ts --terminar <ticket> <si|no> → tarjeta según haya PR
// env: GITHUB_REPOSITORY, PROJECT_TOKEN (opcional: sin él la tarjeta no se mueve)
import { pathToFileURL } from "node:url";

type Opcion = { id: string; name: string };

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type Columna = "en-curso" | "en-revision" | "por-hacer";
const NOMBRES: Record<Columna, string[]> = {
  "en-curso": ["en curso", "in progress"],
  "en-revision": ["en revision", "in review"],
  "por-hacer": ["por hacer", "todo", "to do"],
};

/** La opción de esa columna en el campo Status del tablero (sin importar mayúsculas, tildes ni idioma). */
export function opcionDe(opciones: Opcion[], columna: Columna): string | null {
  return opciones.find((o) => NOMBRES[columna].includes(normal(o.name)))?.id ?? null;
}

export const opcionEnCurso = (opciones: Opcion[]) => opcionDe(opciones, "en-curso");

export const columnaAlTerminar = (hayPr: boolean): Columna => (hayPr ? "en-revision" : "por-hacer");

export function comentarioEnCurso(ticket: number, urlRun: string): string {
  return `🤖 Claude está trabajando en el ticket #${ticket}. Puedes seguirlo aquí: ${urlRun}\n\nCuando termine, abre el PR (o deja aquí el motivo si no puede).`;
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await r.json()) as { data?: T; errors?: { message: string }[] };
  if (!r.ok || json.errors) throw new Error(json.errors?.map((e) => e.message).join("; ") ?? `HTTP ${r.status}`);
  return json.data as T;
}

type Items = {
  repository: {
    issue: {
      projectItems: {
        nodes: { id: string; project: { id: string; field: { id: string; options: Opcion[] } | null } }[];
      };
    };
  };
};

/** Mueve la tarjeta del ticket a esa columna en cada tablero donde esté. Devuelve cuántas movió. */
export async function moverTarjeta(token: string, owner: string, repo: string, ticket: number, columna: Columna): Promise<number> {
  const datos = await graphql<Items>(
    token,
    `query($owner: String!, $repo: String!, $n: Int!) {
      repository(owner: $owner, name: $repo) { issue(number: $n) { projectItems(first: 10) { nodes {
        id project { id field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } } }
      } } } }
    }`,
    { owner, repo, n: ticket },
  );
  let movidas = 0;
  for (const item of datos.repository.issue.projectItems.nodes) {
    const campo = item.project.field;
    const opcion = campo ? opcionDe(campo.options, columna) : null;
    if (!campo || !opcion) continue;
    await graphql(
      token,
      `mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
        updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) { clientMutationId }
      }`,
      { p: item.project.id, i: item.id, f: campo.id, o: opcion },
    );
    movidas++;
  }
  return movidas;
}

const TITULOS: Record<Columna, string> = { "en-curso": "En curso", "en-revision": "En revisión", "por-hacer": "Por hacer" };

async function mover(ticket: number, columna: Columna) {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "/").split("/");
  const token = process.env.PROJECT_TOKEN;
  if (!token) return console.error("Sin PROJECT_TOKEN: la tarjeta no se mueve.");
  try {
    const n = await moverTarjeta(token, owner, repo, ticket, columna);
    console.error(`Tarjeta movida a «${TITULOS[columna]}» en ${n} tablero(s).`);
  } catch (e) {
    console.error(`No se pudo mover la tarjeta (revisa PROJECT_TOKEN): ${(e as Error).message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === "--terminar") await mover(Number(args[1]), columnaAlTerminar(args[2] === "si"));
  else {
    process.stdout.write(comentarioEnCurso(Number(args[0]), args[1]) + "\n");
    await mover(Number(args[0]), "en-curso");
  }
}
