// Bundle report for `bun run analyze`. Only passes .js files that have a sibling .map:
// re-export-only chunks, the rolldown runtime and the service-worker files ship without one.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { explore } from 'source-map-explorer';

const dir = 'dist/skolenza/browser';
const filename = 'dist/skolenza/bundle-report.html';

const bundles = readdirSync(dir)
  .filter((f) => f.endsWith('.js') && existsSync(join(dir, `${f}.map`)))
  .map((f) => join(dir, f));

try {
  const result = await explore(bundles, {
    output: { format: 'html', filename },
    noBorderChecks: true,
  });
  // "Unable to map N bytes" warnings are skipped: the report already shows them as [unmapped].
  for (const { bundleName, message, isWarning } of result.errors) {
    if (!isWarning) console.error(`${bundleName}: ${message}`);
  }
  console.log(`Output saved to ${filename} (${bundles.length} bundles)`);
} catch (error) {
  for (const { bundleName, message } of error.errors ?? [error]) {
    console.error(`${bundleName ?? ''}: ${message}`);
  }
  process.exitCode = 1;
}
