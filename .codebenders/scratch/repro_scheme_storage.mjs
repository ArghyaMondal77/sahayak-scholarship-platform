import { createServer } from 'vite';
const store = new Map();
globalThis.window = { localStorage: {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
}};
const server = await createServer({ root: process.cwd(), configFile: false, logLevel: 'error', server: { middlewareMode: true } });
try {
  const m = await server.ssrLoadModule('/src/utils/schemeStorage.js');
  const base = m.getAllSchemes();
  const firstId = base[0].id;
  console.log('bundled count:', base.length, 'first id:', firstId);
  m.saveCustomScheme({ id: 'test-custom-1', name: 'Test', deadline_date: '2099-01-01' });
  m.updateSchemeOverride(firstId, { deadline_date: '2099-02-02' });
  console.log('localStorage keys:', [...store.keys()]);
  const all = m.getAllSchemes();
  const custom = all.find((s) => s.id === 'test-custom-1');
  const ov = all.find((s) => s.id === firstId);
  console.log('custom appears:', !!custom, custom?.deadline_date);
  console.log('override applied:', ov?.deadline_date);
} finally {
  await server.close();
}
