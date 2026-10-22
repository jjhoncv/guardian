# 0030. Claude en la nube puede usar la suscripción del dueño

- **Fecha:** 2026-10-22
- **Estado:** aceptada

## Contexto

Con la API key (ADR 0024) cada ticket se cobra por uso. En Info Site, pedir 48 maquetas de diseño dentro de un ticket agotó el tope y el run falló sin decir por qué. El dueño quiere que Claude en GitHub use su cuenta de Claude, como en Claude Code local.

## Decisión

- `guardian-claude.yml` acepta **`CLAUDE_CODE_OAUTH_TOKEN`** (token de la suscripción, generado con `claude setup-token`, dura 1 año) o **`ANTHROPIC_API_KEY`**. Si el repo tiene los dos, manda la suscripción.
- `nuevo-proyecto.sh` pregunta cuál usar y anota el vencimiento del token (`VENCE_CLAUDE_CODE_OAUTH_TOKEN`) para el aviso de 7 días.
- El token lo genera y lo carga el dueño en su terminal; el consultor nunca lo ve.

## Por qué

Sin cobro por uso ni sorpresas de gasto: entra en el plan del dueño. Lo permite la acción oficial de Claude en GitHub (`claude_code_oauth_token`).

## Consecuencias

- **El límite de uso se comparte** con el Claude Code local del dueño: un ticket grande en la nube deja menos para trabajar en la terminal, y al revés. Por eso importan los tickets chicos y explorar diseños fuera de los tickets.
- Si se llega al límite, Claude en la nube se detiene hasta que se renueva la ventana del plan.
