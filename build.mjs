import esbuild from 'esbuild';
import postCSS from 'esbuild-postcss';

const result = await esbuild.build({
  entryPoints: ['index.tsx'],
  bundle: true,
  outfile: 'dist/bundle.js',
  loader: {
    '.tsx': 'tsx',
    '.mov': 'file',
    '.mp4': 'file',
  },
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_KEY': '"AIzaSyD0JEm3fqse7TQZ1ri2UWMmdtJigyX3fpo"',
    'import.meta.env.VITE_BETA_BUILD': `"${process.env.VITE_BETA_BUILD || 'false'}"`,
  },
  plugins: [postCSS()],
  metafile: true,
});

console.log(await esbuild.analyzeMetafile(result.metafile, {
  verbose: false,
}));
