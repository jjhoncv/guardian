# 0028. Los avisos los despierta Netlify, no el cron de GitHub

- **Fecha:** 2026-10-10
- **Estado:** aceptada

## Contexto

Los avisos por Telegram (Fase 5) deben salir dentro de las ventanas del dueño (8:00–9:00 y 19:00–22:00, Lima). El `schedule` de GitHub Actions no garantiza la hora: el 2026-10-09 corrió el ☀️ con 5 h 33 min de atraso, y con 4 intentos por ventana (#210), de 16 intentos programados corrió uno solo, a las 4:06 (run 38040226415). La lógica del Guardián estaba bien: fuera de la ventana, no mandó nada.

## Decisión

- Una **función programada de Netlify** en el sitio del Guardián (`netlify/functions/despertador.mts`, cron `7,22,37,52 0-2,13 * * *` en UTC) le pide a GitHub correr `avisos.yml` con `aviso=auto`, la misma lógica que el cron: ventanas, una vez por día y emergencias.
- **Token:** fine-grained, **solo el repo guardian**, permiso **Actions: Read and write**, 90 días. Vive en la variable secreta `GUARDIAN_DESPERTADOR_TOKEN` de Netlify (alcance Functions) y su vencimiento, en la variable `VENCE_GUARDIAN_DESPERTADOR_TOKEN` del repo, para que el Guardián avise antes.
- Los cron de GitHub de `avisos.yml` **se retiran**: casi nunca corrían y, cuando lo hacían, caían fuera de la ventana. Estado (6:00) y Sheet (6:30) siguen con el cron de GitHub: un atraso de horas ahí no afecta a nadie.
- Si dos intentos se cruzan, la memoria (`hechos` del día) y la concurrencia del workflow evitan el duplicado.

## Por qué

Netlify ya está en el stack y cuesta lo mismo (unas 16 ejecuciones de un segundo por día, dentro del plan gratis). Un cron externo sumaría otra cuenta y dejaría el token fuera de los servicios del dueño. Las funciones programadas solo corren en el deploy de **producción**, que ya pasa por la aprobación del dueño.

## Consecuencias

- Si el token vence o falta, la función falla y lo deja en su log de Netlify. El aviso de tokens por vencer lo anticipa 7 días antes.
- Un cambio en los avisos se activa en producción solo después del release, como el resto del Guardián.
