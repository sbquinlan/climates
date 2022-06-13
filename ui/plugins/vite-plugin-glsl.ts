import { dirname } from 'path';

import { createFilter } from '@rollup/pluginutils';
// @ts-ignore glslify doesn't have types
import { compile } from 'glslify';
import { Plugin, transformWithEsbuild } from "vite";
 
export default function glslify(plugin_options: { include?: string[], exclude?: string[] } = {}): Plugin {
    const options = {
      include: [
        '**/*.vs',
        '**/*.fs',
        '**/*.vert',
        '**/*.frag',
        '**/*.glsl'
      ],
      ... plugin_options,
    };
    const filter = createFilter(options.include, options.exclude);

    return {
      name: 'glslify',

      transform(code, id) {
        if (!filter(id)) return;
        return transformWithEsbuild(
          compile(code, { basedir: dirname(id) }),
          id,
          {
            sourcemap: 'external',
            // should be based on mode
            minifyWhitespace: true,
            loader: 'text',
            format: 'esm',
          }
        );
      }
    };
};