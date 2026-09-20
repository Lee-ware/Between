// BETWEEN product/version constants — keep app, content, storage and cache versions separate.
const BETWEEN_VERSION = Object.freeze({
  app: '4.0.1',
  content: (window.BETWEEN_DATA && window.BETWEEN_DATA.version) || '1.2',
  storage: 2,
  cache: 'between-v4.0.1',
  creator: 'THEE LPM',
});
