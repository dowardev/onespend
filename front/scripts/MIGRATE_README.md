Migración de fechas — Uso para usuarios

Objetivo

Normalizar las fechas dentro de las copias de seguridad a formato `YYYY-MM-DD` para evitar desplazamientos por zona horaria.

Opciones para usuarios no técnicos

1. Usar la interfaz dentro de la app (recomendado)

- Abre la aplicación.
- En el menú principal (lado izquierdo) ve a "Estadisticas" → "Admin: Migrar Fechas".
- Pasos dentro de la página:
  1. Haz clic en "Exportar copia de seguridad (JSON)" y guarda el archivo en tu equipo.
  2. Haz clic en "Simular migración (dry-run)". La app mostrará cuántas entradas cambiarían y ejemplos.
  3. Si todo está bien, haz clic en "Aplicar migración". La app pedirá confirmación y aplicará los cambios.

2. Usar script (para un operador con acceso a la carpeta del proyecto)

- Requisitos: `pnpm` y `ts-node` o ejecutar desde una instalación con Node configurado.
- Comandos:
  - Dry-run (no modifica): `pnpm ts-node scripts/run-normalize-dates.ts`
  - Aplicar: `pnpm ts-node scripts/run-normalize-dates.ts --apply`

Precauciones

- Siempre exporta/guarda la copia de seguridad antes de aplicar.
- No cierres la aplicación mientras se aplica la migración.
- Si algo falla, restaura desde la copia de seguridad guardada.

Soporte

Si necesitas ayuda, comparte el archivo JSON exportado con el equipo de soporte y pueden ejecutar un dry-run localmente para validar los cambios.
