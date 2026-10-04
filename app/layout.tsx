import type { Metadata } from "next";
import { leerNombreDelProyecto } from "@/lib/nombre-proyecto";

export const metadata: Metadata = {
  title: leerNombreDelProyecto(),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
