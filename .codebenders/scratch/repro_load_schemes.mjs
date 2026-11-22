import { createServer } from 'vite';
const store = new Map();
globalThis.window = { localStorage: {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
}};
const server = await createServer({ root: process.cwd(), configFile: false, logLevel: 'error', server: { middlewareMode: true } });
try {
  const m = await server.ssrLoadModule('/src/utils/schemeStorage.js');
  const firstId = m.loadSchemes()[0].id;
  m.saveCustomScheme({ id: 'test-custom-1', name: 'Test', deadline_date: '2099-01-01' });
  m.updateSchemeOverride(firstId, { deadline_date: '2099-02-02' });
  const viaPages = m.loadSchemes();
  console.log('loadSchemes count:', viaPages.length);
  console.log('custom appears in loadSchemes:', viaPages.some((s) => s.id === 'test-custom-1'));
  console.log('override applied in loadSchemes:', viaPages.find((s) => s.id === firstId)?.deadline_date);
} finally {
  await server.close();
}
