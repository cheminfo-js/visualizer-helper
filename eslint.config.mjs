import { defineConfig, globalIgnores } from 'eslint/config';
import { globals } from 'eslint-config-zakodium';
import js from 'eslint-config-zakodium/js';

export default defineConfig(
  globalIgnores([
    'node_modules',
    'build',

    // Ignore third-party libraries
    'tiles/font-awesome',
    'util/aesjs.js',
    'util/cloneDeepLimitArray.js',
    'util/md5.js',
    'util/yamlParser.js',
    'spectra-data/conrec.js',
  ]),
  {
    languageOptions: {
      globals: {
        define: 'readonly',
        module: 'writable',
        require: 'readonly',
        DataObject: 'readonly',
        $: 'readonly',
        ...globals.browser,
        ...globals.jest,
      },
    },
  },
  js,
  {
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'no-await-in-loop': 'warn',
      'prefer-named-capture-group': 'off',
    },
  },
);
