import { leerNombreDelProyecto } from "@/lib/nombre-proyecto";

export default function Page() {
  return (
    <main>
      <h1>{leerNombreDelProyecto()}</h1>
    </main>
  );
}
