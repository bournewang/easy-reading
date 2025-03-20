import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import { join } from 'path';

export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      name: 'content'
    },
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      alias({
        entries: [
          { find: '@easy-reading/shared', replacement: join(__dirname, '../shared/src') }
        ]
      }),
      replace({
        'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL),
        preventAssignment: true
      })
    ]
  },
  {
    input: 'src/pages/wordlist.ts',
    output: {
      file: 'dist/wordlist.js',
      format: 'iife',
      name: 'wordlist'
    },
    plugins: [/* same plugins as above */]
  }
];