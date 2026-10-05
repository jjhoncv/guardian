# Mocks

| Carpeta / archivo | Para qué |
|---|---|
| `contratos/*.schema.json` | Contrato (JSON Schema) de cada API: entradas y salidas. Es la fuente de verdad. |
| `fixtures/*.json` | Datos falsos que **cumplen** su contrato (lo verifica `mocks.test.ts`). |
| `handlers.ts` | APIs simuladas con MSW, respondiendo con los fixtures. |
| `servidor.ts` | Servidor de MSW para las pruebas en Node. |

Para una API nueva: contrato → fixture → handler → prueba que valide el fixture contra el contrato.
