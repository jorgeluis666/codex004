# Planificador de Crecimiento de Contenido

Aplicación frontend para Lima Retail, una agencia de marketing digital que quiere mejorar su estrategia de contenidos en TikTok e Instagram usando datos reales de rendimiento.

La app usa datos de prueba con la misma forma esperada para una futura integración entre Google Sheets y reportes de Metricool. Analiza temas, ganchos, plataformas, alcance, interacción, crecimiento de seguidores y convierte esas señales en recomendaciones tácticas para próximos reels.

## Qué Incluye

- Panel con análisis por tema, plataforma, gancho y decisión estratégica
- Clasificación automática en categorías de contenido
- Matriz de alcance e interacción
- Filtros globales por fecha según el periodo disponible en los datos
- Tabla de rendimiento con búsqueda y filtro por categoría
- Motor de recomendaciones para nuevas ideas de reels
- Vista editable de Próximos Reels
- Datos de prueba listos para reemplazarse por Google Sheets y Metricool

## Reglas Estratégicas

- Buena interacción pero bajo alcance: mejorar ganchos
- Alto alcance pero baja interacción: mejorar mensaje
- Alto alcance y alta interacción: repetir contenido
- Bajo alcance y baja interacción: detener o pivotar

## Instalación

```bash
npm install
npm run dev
```

Luego abre la URL local que muestra Vite en la terminal.

## Build

```bash
npm run build
```

## Futura Integración Con Google Sheets

El frontend espera filas con esta estructura:

- platform
- contentType
- topic
- hook
- objective
- impressions
- reach
- views
- likes
- comments
- saves
- shares
- followersGained
- publishedAt

Reemplaza `src/data/mockContent.js` por las filas obtenidas desde Google Sheets y pásalas por `enrichContent`, `filterContentByDate` y `buildDashboard` desde `src/utils/analytics.js`.
