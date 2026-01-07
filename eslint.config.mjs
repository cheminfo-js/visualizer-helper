import {defineConfig, globalIgnores} from 'eslint/config';
import {globals} from 'eslint-config-zakodium';
import js from 'eslint-config-zakodium/js';


export default defineConfig(
    globalIgnores(['node_modules', 'build', 'tiles/font-awesome',
        // Ignore third-party libraries
        'util/aesjs.js',
        'util/cloneDeepLimitArray.js',
        'util/md5.js',
        'util/yamlParser.js',
        'spectra-data/conrec.js'
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
            }
        }
    },
    js,
    {
        rules: {
            'import/no-extraneous-dependencies': 'off',
            'import/no-named-as-default': 'off',
            'import/no-named-as-default-member': 'off'
        }
    }
)
