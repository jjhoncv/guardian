# 0002. Google Sheets como base de datos

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

El guardián necesita un tablero visible desde el celular y las apps del MVP una BD simple.

## Decisión

Google Sheets como tablero del guardián y BD de la app mientras sea MVP. Sheet de pruebas y de producción con service accounts separadas. GitHub es la fuente de verdad de la ejecución; el Sheet se alimenta desde GitHub.

## Por qué

Simple, gratis y se lee desde el celular. Migrar a una BD real está en el Parking lot.
