import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig([
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        sourceMap: true
      })
    ],
    external: [
      'cypress',
      'express',
      'socket.io',
      'sqlite3',
      'sharp',
      'uuid',
      'date-fns',
      'fs-extra',
      'puppeteer',
      'jspdf',
      'html2canvas',
      'mocha',
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'path',
      'fs',
      'os',
      'crypto',
      'events'
    ]
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: true
      })
    ],
    external: [
      'cypress',
      'express',
      'socket.io',
      'sqlite3',
      'sharp',
      'uuid',
      'date-fns',
      'fs-extra',
      'puppeteer',
      'jspdf',
      'html2canvas',
      'mocha',
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'path',
      'fs',
      'os',
      'crypto',
      'events'
    ]
  }
]);