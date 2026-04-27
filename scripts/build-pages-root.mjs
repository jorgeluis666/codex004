import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entryPath = path.join(root, '.pages-entry.html');
const distPath = path.join(root, '.pages-dist');
const publicAssetsPath = path.join(root, 'assets');

const entryHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planificador de Crecimiento de Contenido</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

process.env.GITHUB_PAGES = 'true';
process.env.STABLE_ASSETS = 'true';
process.env.PAGES_ENTRY_BUILD = 'true';

await rm(distPath, { recursive: true, force: true });
await writeFile(entryPath, entryHtml);

try {
  const { build } = await import('vite');
  await build({
    build: {
      outDir: distPath,
      emptyOutDir: true,
    },
  });

  await mkdir(publicAssetsPath, { recursive: true });
  await cp(path.join(distPath, 'assets'), publicAssetsPath, { recursive: true });

  const builtEntry = path.join(distPath, '.pages-entry.html');
  if (existsSync(builtEntry)) {
    await cp(builtEntry, path.join(distPath, 'index.html'));
  }
} finally {
  await rm(entryPath, { force: true });
}
