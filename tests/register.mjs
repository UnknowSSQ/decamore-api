/** tsx 把 .ts 编译成 CJS 走 require，所以要用 registerHooks（同时覆盖 require 与 import），module.register 只管 ESM */
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NO_OP = new Set(['server-only', 'client-only']);
/** CJS 的 load 会把 data: URL 当文件名读，所以指向一个真实的空文件 */
const NO_OP_URL = pathToFileURL(fileURLToPath(new URL('./fixtures/no-op.js', import.meta.url))).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (NO_OP.has(specifier)) return { url: NO_OP_URL, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
