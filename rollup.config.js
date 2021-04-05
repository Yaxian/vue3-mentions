import vuePlugin from 'rollup-plugin-vue'
import { terser } from 'rollup-plugin-terser';

const format = process.env.BUILD_FORMAT;

const fileName = ((format) => {
  switch (format) {
    case 'cjs':
      return 'index.common.js';
    case 'umd':
      return 'index.umd.js';
  }
})(format);

export default {
  input: './src/index.js',
  output: {
    name: `bundle.${format}.js`,
    file: `dist/${fileName}`,
    format,
  },

  plugins: [
    // typescript({
    //   tsconfig: 'tsconfig.build.json',
    // }),
    vuePlugin(/* options */),

    terser({
      format: {
        comments: false,
      },
    }),
  ],
};