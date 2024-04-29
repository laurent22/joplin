module.exports = {
	'root': true,
	'env': {
		'browser': true,
		'es6': true,
		'node': true,
	},
	'parser': '@typescript-eslint/parser',
	'extends': ['eslint:recommended'],
	'settings': {
		'react': {
			'version': '16.12',
		},
	},
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly',

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
	},
	'parserOptions': {
		'ecmaVersion': 2018,
		'ecmaFeatures': {
			'jsx': true,
		},
		'sourceType': 'module',
	},
	'rules': {
		// -------------------------------
		// Code correctness
		// -------------------------------
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',
		'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
		'@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
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
	'plugins': [
		'react',
		'@typescript-eslint',
		// Need to use a fork of the official rules of hooks because of this bug:
		// https://github.com/facebook/react/issues/16265
		'@seiyab/eslint-plugin-react-hooks',
		// 'react-hooks',
		'import',
		'promise',
		'jest',
		'github',
	],
	'overrides': [
		{
			'files': [
				'packages/tools/**',
				'packages/app-mobile/tools/**',
				'packages/app-desktop/tools/**',
			],
			'rules': {
				'no-console': 'off',
			},
		},
		{
			// enable the rule specifically for TypeScript files
			'files': ['*.ts', '*.tsx'],
			'parserOptions': {
				// Required for @typescript-eslint/no-floating-promises
				'project': './tsconfig.eslint.json',
			},
			'rules': {
				'@typescript-eslint/indent': ['error', 'tab', {
					'ignoredNodes': [
						// See https://github.com/typescript-eslint/typescript-eslint/issues/1824
						'TSUnionType',
					],
				}],
				'@typescript-eslint/ban-ts-comment': ['error'],
				'@typescript-eslint/ban-types': 'error',
				'@typescript-eslint/explicit-member-accessibility': ['error'],
				'@typescript-eslint/type-annotation-spacing': ['error', { 'before': false, 'after': true }],
				'@typescript-eslint/array-type': 'error',
				'@typescript-eslint/no-inferrable-types': ['error'],
				'@typescript-eslint/comma-dangle': ['error', {
					'arrays': 'always-multiline',
					'objects': 'always-multiline',
					'imports': 'always-multiline',
					'exports': 'always-multiline',
					'enums': 'always-multiline',
					'generics': 'always-multiline',
					'tuples': 'always-multiline',
					'functions': 'always-multiline',
				}],
				'@typescript-eslint/object-curly-spacing': ['error', 'always'],
				'@typescript-eslint/semi': ['error', 'always'],
				'@typescript-eslint/member-delimiter-style': ['error', {
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
							'regex': '^(RSA|RSAKeyPair)$',
							'match': true,
						},
					},
				],
			},
		},
	],
};
