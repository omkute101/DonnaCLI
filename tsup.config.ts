import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  // Don't bundle these — they have native bindings or must be resolved at runtime
  external: [
    'speaker',
    'node-record-lpcm16',
    '@elevenlabs/elevenlabs-js',
  ],
  banner: {
    // Needed for ESM + __dirname compatibility
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});
