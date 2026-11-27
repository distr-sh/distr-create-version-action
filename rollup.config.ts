// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import type {RollupOptions} from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

const config: RollupOptions = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true,
  },
  // TypeScript 7 has no compiler API for rollup, so esbuild strips the types and `tsc --noEmit` checks them.
  plugins: [esbuild({target: 'node24'}), nodeResolve(), commonjs()],
};

export default config;
