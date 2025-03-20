import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import { fileURLToPath } from 'url';
import { dirname, resolve as pathResolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  input: {
    content: 'src/content.ts',
    wordlist: 'src/pages/wordlist.ts'
  },
  output: {
    dir: 'dist',
    format: 'iife',
    entryFileNames: '[name].js'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        emitDeclarationOnly: true,
        allowImportingTsExtensions: true,
        moduleResolution: 'bundler'
      }
    }),
    resolve({
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      moduleDirectories: ['node_modules'],
      mainFields: ['module', 'main']
    }),
    commonjs({
      include: /node_modules/
    }),
    alias({
      entries: [
        { 
          find: '@english-reader/shared', 
          replacement: pathResolve(__dirname, '../shared/src/index.ts') 
        }
      ]
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
};