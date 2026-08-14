<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Budget Add Popover + Providers en Inicio - Design

## Resumen del cambio

El botón "+" en la pestaña "Inicio" de la página `/budget` debe mostrar un Popover Ionic con dos opciones:
- "Registro" → navega a `/budget/entry/new` (comportamiento actual)
- "Proveedores" → navega a `/budget/provider/new`

Al crear un proveedor desde `/budget/provider/new`, este debe mostrarse en la tabla de la pestaña "Inicio", mezclado cronológicamente con los entries (ingresos/egresos).

## Requisitos

1. **Popover en botón Add**: El botón "+" de la pestaña inicio abre un `ion-popover` con dos opciones
2. **Navegación a nuevo provider**: La opción "Proveedores" navega a `/budget/provider/new`
3. **Provider visible en inicio**: Al guardar un provider y volver a inicio, aparece en la lista mezclado con entries
4. **Mismo estilo visual**: Los providers se renderizan con el mismo estilo visual que los entries
5. **Orden cronológico**: La lista combinada (entries + providers) está ordenada por fecha/hora de creación
6. **Edición de provider**: Click en un provider navega a `/budget/provider/edit?providerId=X`
7. **Pestaña proveedores**: Se eliminará (el usuario lo hace manualmente)

## Componentes afectados

### InicioViewComponent.vue

Cambios necesarios:

1. **Agregar popover**:
   - Agregar template de `ion-popover` con dos `ion-item` (Registro, Proveedores)
   - El botón "+" debe tener un `trigger` que abra el popover en lugar de navegar directamente

2. **Computed de items unificados**:
   - Crear un `computed` que combine entries y providers en una lista única
   - Cada item debe tener: `id`, `name`, `amount`, `date`, `type` ('entry' | 'provider'), `createdAt`
   - Para entries: usar campos existentes del tipo `Income`
   - Para providers: usar campos del tipo `Provider`
   - Ordenar por `createdAt` (timestamp)

3. **Renderizar lista unificada**:
   - El `v-for` actual debe iterar sobre el computed unificado
   - Cada item renderiza con el estilo visual actual de entry
   - Internamente differentiate por `type` para determinar qué campos usar y qué navegación al hacer click

4. **Click handler**:
   - Si `type === 'entry'`: navegar a `/budget/entry/edit?entryId=${id}`
   - Si `type === 'provider'`: navegar a `/budget/provider/edit?providerId=${id}`

### ProviderEditPage.vue

Sin cambios de comportamiento:
- Ya usa `router.back()` al guardar
- Al volver, el provider ya está persistido en el store a través del controller

### AGENTS.md

Actualizar sección "Controller-Only Communication" para aclarar:
- La restricción aplica solo a conexiones externas (stores, APIs)
- Componentes pueden contener lógica local (computed, funciones, vars, watchers, onMounted)
- Agregar ejemplo de computed local permitido

## Tipo unificado

```ts
interface UnifiedItem {
  id: string
  name: string
  amount: number
  date: string
  type: 'entry' | 'provider'
  // Solo para entries
  entryType?: 'ingreso' | 'egreso'
  accountId?: string
  // Timestamp para ordenar
  createdAt: number
}
```

## Estructura del popover (template)

```html
<ion-popover
  trigger="add-button"
  trigger-action="click"
  side="bottom"
  alignment="end"
>
  <ion-content>
    <ion-list lines="none">
      <ion-item button @click="handleRegistroClick">
        <ion-icon :icon="documentTextOutline" slot="start"></ion-icon>
        <ion-label>Registro</ion-label>
      </ion-item>
      <ion-item button @click="handleProveedoresClick">
        <ion-icon :icon="peopleOutline" slot="start"></ion-icon>
        <ion-label>Proveedores</ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</ion-popover>
```

## Flujo

1. Usuario hace click en "+" en pestaña inicio
2. Se abre el popover con opciones "Registro" y "Proveedores"
3. Usuario selecciona "Registro" → navega a `/budget/entry/new` (sin cambios)
4. Usuario selecciona "Proveedores" → navega a `/budget/provider/new`
5. Usuario llena el formulario de provider y guarda
6. Se navega de vuelta (`router.back()`)
7. La pestaña inicio muestra ahora el provider en la lista, mezclado con entries, ordenado cronológicamente
8. Click en el provider navega a `/budget/provider/edit?providerId=X` (editar)

## Notas de implementación

- Los providers ya se guardan en el store vía `budgetController.addProvider()` - no hay cambio en la persistencia
- La combinación de entries + providers en el computed es lógica local del componente (permitida según convención actualizada)
- El campo `createdAt` debe existir en los tipos `Income` y `Provider` - verificar que existe o agregar si es necesario