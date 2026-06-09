const { defineConfig } = require('eslint/config');

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const stylistic = require('@stylistic/eslint-plugin');
const seiyabEslintPluginReactHooks = require('@seiyab/eslint-plugin-react-hooks');
const _import = require('eslint-plugin-import');
const promise = require('eslint-plugin-promise');
const jest = require('eslint-plugin-jest');
const github = require('eslint-plugin-github');

const { fixupPluginRules, includeIgnoreFile } = require('@eslint/compat');
const js = require('@eslint/js');

const { join } = require('path');

// As of ESLint v9, .eslintignore is no longer supported and the presence of
// a ".eslintignore" file causes "yarn linter" to emit a warning. Work around this
// by using an ignore file with a different name.
const ignoreFile = includeIgnoreFile(join(__dirname, '.ignore.eslint'));

module.exports = defineConfig([{
	name: 'Base rules (all config targets)',

	linterOptions: {
		// ESLint v9 changed the default to "warn". Leave as "off" for now to limit
		// the codebase changes needed as part of the ESLint v9 upgrade.
		// TODO: Set to "error".
		reportUnusedDisableDirectives: 'off',
	},

	languageOptions: {
		globals: {
			...globals.browser,
			...globals.node,
			...globals.es2021,
			'Atomics': 'readonly',
			'SharedArrayBuffer': 'readonly',
			'BufferEncoding': 'readonly',
			'AsyncIterable': 'readonly',
			'FileSystemFileHandle': 'readonly',
			'FileSystemDirectoryHandle': 'readonly',
			'ReadableStreamDefaultReader': 'readonly',
			'FileSystemCreateWritableOptions': 'readonly',
			'FileSystemHandle': 'readonly',
			'IDBTransactionMode': 'readonly',
			'FlatArray': 'readonly',
			'BigInt': 'readonly',
			'globalThis': 'readonly',

			// ServiceWorker
			'ExtendableEvent': 'readonly',
			'WindowClient': 'readonly',
			'FetchEvent': 'readonly',

			// Jest variables
			'test': 'readonly',
			'expect': 'readonly',
			'describe': 'readonly',
			'it': 'readonly',
			'beforeAll': 'readonly',
			'afterAll': 'readonly',
			'beforeEach': 'readonly',
			'afterEach': 'readonly',
			'jest': 'readonly',

			// React Native variables
			'__DEV__': 'readonly',

			// Clipper variables
			'browserSupportsPromises_': true,
			'chrome': 'readonly',
			'browser': 'readonly',

			// Server admin UI global variables
			'onDocumentReady': 'readonly',
			'setupPasswordStrengthHandler': 'readonly',
			'$': 'readonly',
			'zxcvbn': 'readonly',

			'tinymce': 'readonly',

			'JSX': 'readonly',

			'NodeJS': 'readonly',
		},

		parser: tsParser,
		ecmaVersion: 2018,
		sourceType: 'module',

		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},

	extends: [js.configs.recommended],

	settings: {
		react: {
			version: '19.1',
		},
	},

	rules: {
		// -------------------------------
		// Code correctness
		// -------------------------------
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',
		// ESLint 9 / typescript-eslint 8 flipped `caughtErrors` to 'all'; keep
		// the previous 'none' so unused `catch` bindings are not newly flagged.
		'no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'caughtErrors': 'none' }],
		'@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'caughtErrors': 'none' }],
		'@typescript-eslint/explicit-member-accessibility': 'off',
		'no-constant-condition': 0,
		'no-prototype-builtins': 0,
		// This error is always a false positive so far since it detects
		// possible race conditions in contexts where we know it cannot happen.
		'require-atomic-updates': 0,
		'prefer-const': ['error'],
		'no-var': ['error'],
		'no-new-func': ['error'],
		'import/prefer-default-export': ['error'],
		'prefer-promise-reject-errors': ['error', {
			allowEmptyReject: true,
		}],
		'no-throw-literal': ['error'],
		'no-unused-expressions': ['error'],

		// This rule should not be enabled since it matters in what order
		// imports are done, in particular in relation to the shim.setReact
		// call, which should be done first, but this rule might move it down.
		// 'import/first': ['error'],

		'no-array-constructor': ['error'],
		'radix': ['error'],
		'eqeqeq': ['error', 'always'],
		'no-console': ['error', { 'allow': ['warn', 'error'] }],

		// Warn only for now because fixing everything would take too much
		// refactoring, but new code should try to stick to it.
		// 'complexity': ['warn', { max: 10 }],

		// Checks rules of Hooks
		'@seiyab/react-hooks/rules-of-hooks': 'error',
		'@seiyab/react-hooks/exhaustive-deps': ['error', { 'ignoreThisDependency': 'props' }],

		// Checks effect dependencies
		// Disable because of this: https://github.com/facebook/react/issues/16265
		// "react-hooks/exhaustive-deps": "warn",

		'jest/require-top-level-describe': ['error', { 'maxNumberOfTopLevelDescribes': 1 }],
		'jest/no-identical-title': ['error'],
		'jest/prefer-lowercase-title': ['error', { 'ignoreTopLevelDescribe': true }],

		'promise/prefer-await-to-then': 'error',
		'no-unneeded-ternary': 'error',
		'github/array-foreach': ['error'],

		'no-restricted-properties': ['error',
			{
				'property': 'focus',
				'message': 'Please use focusHandler::focus() instead',
			},
			{
				'property': 'blur',
				'message': 'Please use focusHandler::blur() instead',
			},
		],

		'@typescript-eslint/no-explicit-any': ['error'],

		// -------------------------------
		// Formatting
		// -------------------------------
		'space-in-parens': ['error', 'never'],
		'space-infix-ops': ['error'],
		'curly': ['error', 'multi-line', 'consistent'],
		'semi': ['error', 'always'],
		'eol-last': ['error', 'always'],
		'quotes': ['error', 'single'],

		// Note that "indent" only applies to JavaScript files. See
		// https://github.com/laurent22/joplin/issues/8360
		'indent': ['error', 'tab'],
		'comma-dangle': ['error', {
			'arrays': 'always-multiline',
			'objects': 'always-multiline',
			'imports': 'always-multiline',
			'exports': 'always-multiline',
			'functions': 'always-multiline',
		}],
		'comma-spacing': ['error', { 'before': false, 'after': true }],
		'no-trailing-spaces': 'error',
		'linebreak-style': ['error', 'unix'],
		'prefer-template': ['error'],
		'template-curly-spacing': ['error', 'never'],
		'object-curly-spacing': ['error', 'always'],
		'array-bracket-spacing': ['error', 'never'],
		'key-spacing': ['error', {
			'beforeColon': false,
			'afterColon': true,
			'mode': 'strict',
		}],
		'block-spacing': ['error'],
		'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
		'no-spaced-func': ['error'],
		'func-call-spacing': ['error'],
		'space-before-function-paren': ['error', {
			'anonymous': 'never',
			'named': 'never',
			'asyncArrow': 'always',
		}],
		'multiline-comment-style': ['error', 'separate-lines', { checkJSDoc: true }],
		'space-before-blocks': 'error',
		'spaced-comment': ['error', 'always'],
		'keyword-spacing': ['error', { 'before': true, 'after': true }],
		'no-multi-spaces': ['error'],
		'prefer-object-spread': ['error'],
		'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],

		// Regarding the keyword blacklist:
		// - err: We generally avoid using too many abbreviations, so it should
		//   be "error", not "err"
		// - notebook: In code, it should always be "folder" (not "notebook").
		//   In user-facing text, it should be "notebook".
		'id-denylist': ['error', 'err', 'notebook', 'notebooks'],
		'prefer-arrow-callback': ['error'],

		'no-constant-binary-expression': ['error'],
	},

	plugins: {
		react,
		'@typescript-eslint': typescriptEslint,
		'@stylistic': stylistic,
		// Need to use a fork of the official rules of hooks because of this bug:
		// https://github.com/facebook/react/issues/16265
		'@seiyab/react-hooks': fixupPluginRules(seiyabEslintPluginReactHooks),
		import: fixupPluginRules(_import),
		promise,
		jest,
		github: fixupPluginRules(github),
	},
}, {
	files: [
		'packages/tools/**',
		'packages/app-mobile/tools/**',
		'packages/app-desktop/tools/**',
	],

	rules: {
		'no-console': 'off',
	},
}, {
	// .jsx files should be linted with the default rules
	files: ['**/*.jsx'],
}, {
	// enable the rule specifically for TypeScript files
	files: ['**/*.ts', '**/*.tsx'],

	languageOptions: {
		parserOptions: {
			// Required for @typescript-eslint/no-floating-promises
			project: './tsconfig.eslint.json',
		},
	},

	rules: {
		'@stylistic/indent': ['error', 'tab', {
			'ignoredNodes': [
				// See https://github.com/typescript-eslint/typescript-eslint/issues/1824
				'TSUnionType',
				// Disable template literal indentation checking for compatibility with
				// the original indent rule.
				'TemplateLiteral *',
			],
			// @stylistic/indent defaults SwitchCase to 1; the deprecated
			// @typescript-eslint/indent it replaces defaulted to 0, and the
			// codebase is formatted that way (case aligned with switch).
			'SwitchCase': 0,
		}],
		'@typescript-eslint/ban-ts-comment': ['error'],
		// `@typescript-eslint/ban-types` was removed in v8 and split into the
		// rules below, which together reproduce its default behaviour.
		// `allowInterfaces: 'always'` keeps empty interfaces allowed: the old
		// ban-types only banned the `{}` type, not empty interface declarations.
		'@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
		'@typescript-eslint/no-unsafe-function-type': ['error'],
		'@typescript-eslint/no-wrapper-object-types': ['error'],
		'@typescript-eslint/explicit-member-accessibility': ['error'],
		'@stylistic/type-annotation-spacing': ['error', { 'before': false, 'after': true }],
		'@typescript-eslint/array-type': 'error',
		'@typescript-eslint/no-inferrable-types': ['error'],
		'@stylistic/comma-dangle': ['error', {
			'arrays': 'always-multiline',
			'objects': 'always-multiline',
			'imports': 'always-multiline',
			'exports': 'always-multiline',
			'enums': 'always-multiline',
			'generics': 'always-multiline',
			'tuples': 'always-multiline',
			'functions': 'always-multiline',
		}],
		'@stylistic/object-curly-spacing': ['error', 'always'],
		'@stylistic/semi': ['error', 'always'],
		'@stylistic/member-delimiter-style': ['error', {
			'multiline': {
				'delimiter': 'semi',
				'requireLast': true,
			},
			'singleline': {
				'delimiter': 'semi',
				'requireLast': false,
			},
		}],
		'@typescript-eslint/no-floating-promises': ['error'],
		'@typescript-eslint/naming-convention': ['error',
			// Naming conventions over the codebase is very inconsistent
			// unfortunately and fixing it would be way too much work.
			// In general, we use "strictCamelCase" for variable names.

			// {
			// 	selector: 'default',
			// 	format: ['StrictPascalCase', 'strictCamelCase', 'snake_case', 'UPPER_CASE'],
			// 	leadingUnderscore: 'allow',
			// 	trailingUnderscore: 'allow',
			// },

			// Each rule below is made of two blocks: first the rule we
			// actually want, and below exceptions to the rule.

			// -----------------------------------
			// ENUM
			// -----------------------------------

			{
				selector: 'enumMember',
				format: ['StrictPascalCase'],
			},
			{
				selector: 'enumMember',
				format: null,
				'filter': {
					'regex': '^(GET|POST|PUT|DELETE|PATCH|HEAD|SQLite|PostgreSQL|ASC|DESC|E2EE|OR|AND|UNION|INTERSECT|EXCLUSION|INCLUSION|EUR|GBP|USD|SJCL.*|iOS)$',
					'match': true,
				},
			},
			{
				selector: 'enumMember',
				format: null,
				'filter': {
					'regex': '^(sha1|sha256|sha384|sha512|AES_128_GCM|AES_192_GCM|AES_256_GCM)$',
					'match': true,
				},
			},

			// -----------------------------------
			// INTERFACE
			// -----------------------------------

			{
				selector: 'interface',
				format: ['StrictPascalCase'],
			},
			{
				selector: 'interface',
				format: null,
				'filter': {
					'regex': '^(RSA|RSAKeyPair|iOS.*)$',
					'match': true,
				},
			},
		],
	},
}, {
	files: ['packages/app-cli/tests/**/*.js'],

	rules: {
		// Ignore all unused function arguments, because in some
		// case they are kept to indicate the function signature.
		'no-unused-vars': ['error', { 'argsIgnorePattern': '.*' }],
		'@typescript-eslint/no-unused-vars': 0,
	},
}, {
	files: ['packages/app-desktop/**/*.{tsx,js,ts}'],

	rules: {
		'no-restricted-globals': ['error',
			...['alert', 'confirm', 'prompt'].map(alertLikeFunction => ({
				'name': alertLikeFunction,
				'message': [
					'Avoid using alert()/confirm()/prompt() in the desktop app -- they break keyboard input on some systems.',
					'Prefer shim.showMessageBox and shim.showConfirmationDialog.',
					'See https://github.com/electron/electron/issues/19977.',
				].join(' '),
			})),
		],
	},
}, ignoreFile]);
