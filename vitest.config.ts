import { defineConfig } from 'vitest/config';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  plugins: [
    typescript({
      tsconfig: './tsconfig.vitest.json',
    }),
  ],
  test: {
    dir: './test',
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.vitest.json',
    },
  },
});
