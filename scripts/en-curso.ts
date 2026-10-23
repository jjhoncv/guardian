// Cuando Claude empieza un ticket, el dueño lo ve: comentario con el link al run, etiqueta `en-curso` y, si el repo
// tiene PROJECT_TOKEN (permiso de proyectos), la tarjeta pasa a «En curso» en el tablero.
// Uso (CI): node scripts/en-curso.ts <ticket> <url-del-run>   env: GH_TOKEN, GITHUB_REPOSITORY, PROJECT_TOKEN (opcional)
import { pathToFileURL } from "node:url";

type Opcion = { id: string; name: string };

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** La opción de la columna «En curso» (o «In progress») del campo Status del tablero. */
export function opcionEnCurso(opciones: Opcion[]): string | null {
  return opciones.find((o) => ["en curso", "in progress"].includes(normal(o.name)))?.id ?? null;
}

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

/** Mueve la tarjeta del ticket a «En curso» en cada tablero donde esté. Devuelve cuántas movió. */
export async function moverAEnCurso(token: string, owner: string, repo: string, ticket: number): Promise<number> {
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
    const opcion = campo ? opcionEnCurso(campo.options) : null;
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [ticket, urlRun] = process.argv.slice(2);
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "/").split("/");
  process.stdout.write(comentarioEnCurso(Number(ticket), urlRun) + "\n");
  const token = process.env.PROJECT_TOKEN;
  if (token) {
    try {
      const n = await moverAEnCurso(token, owner, repo, Number(ticket));
      console.error(`Tarjeta movida a «En curso» en ${n} tablero(s).`);
    } catch (e) {
      console.error(`No se pudo mover la tarjeta (revisa PROJECT_TOKEN): ${(e as Error).message}`);
    }
  } else console.error("Sin PROJECT_TOKEN: la tarjeta no se mueve; quedan el comentario y la etiqueta.");
}
