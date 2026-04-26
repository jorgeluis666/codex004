# Planificador de Crecimiento de Contenido

Aplicación frontend para Lima Retail, una agencia de marketing digital que quiere mejorar su estrategia de contenidos en TikTok e Instagram usando datos reales de rendimiento.

La app usa datos de prueba con la misma forma esperada para una futura integración entre Google Sheets y reportes de Metricool. Analiza temas, ganchos, plataformas, alcance, interacción, crecimiento de seguidores y convierte esas señales en recomendaciones tácticas para próximos reels.

## Qué Incluye

- Formato tipo informe ejecutivo con sidebar por diagnóstico, propuesta y datos
- Panel con análisis por tema, plataforma, gancho y decisión estratégica
- Clasificación automática en categorías de contenido
- Matriz de alcance e interacción
- Filtros globales por fecha según el periodo disponible en los datos
- Tabla de rendimiento con búsqueda y filtro por categoría
- Motor de recomendaciones para nuevas ideas de reels
- Vista editable de Próximos Reels
- Secciones para supuestos de venta, ejes temáticos, mix por plataforma, calendario semanal y acciones de 30 días
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

## Conexión Con Metricool

La app mantiene el modo de datos de prueba por defecto. Para activar Metricool:

1. Copia `.env.example` a `.env`.
2. Cambia `VITE_CONTENT_SOURCE=metricool`.
3. Completa `METRICOOL_USER_TOKEN`, `METRICOOL_USER_ID` y `METRICOOL_BLOG_ID`.
4. Ejecuta el proxy y Vite juntos:

```bash
npm run dev:full
```

También puedes ejecutarlos por separado:

```bash
npm run dev:api
npm run dev
```

La app consulta el proxy local `/api/metricool/content` cada vez que cambias `Desde`, `Hasta`, `Últimos 7 días`, `Últimos 14 días` o haces clic en `Actualizar`.

El token de Metricool queda solo en el proxy local y no se expone en React. Según la documentación oficial de Metricool, el token debe enviarse como header `X-Mc-Auth`, mientras que `userId` y `blogId` identifican la cuenta y marca.

## Build

```bash
npm run build
```

## Despliegue en GitHub Pages

El repo incluye `.github/workflows/deploy-pages.yml` para publicar la carpeta `dist` en GitHub Pages cada vez que se hace push a `main`.

En GitHub, la fuente de Pages debe estar configurada como `GitHub Actions`. La app usa `GITHUB_PAGES=true` durante el build para generar rutas con base `/codex004/`.

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

Si usas Metricool, la normalización ocurre en `server/metricool-proxy.mjs` antes de llegar a React.
