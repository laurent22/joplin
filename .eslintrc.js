module.exports = {
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

		// Jasmine variables
		'expect': 'readonly',
		'describe': 'readonly',
		'it': 'readonly',
		'beforeAll': 'readonly',
		'afterAll': 'readonly',
		'beforeEach': 'readonly',
		'afterEach': 'readonly',
		'jasmine': 'readonly',

		// React Native variables
		'__DEV__': 'readonly',

		// Clipper variables
		'browserSupportsPromises_': true,
		'chrome': 'readonly',
		'browser': 'readonly',

		'tinymce': 'readonly',
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
		'no-unused-vars': 'error',
		'@typescript-eslint/no-unused-vars': 'error',
		'no-constant-condition': 0,
		'no-prototype-builtins': 0,
		// This error is always a false positive so far since it detects
		// possible race conditions in contexts where we know it cannot happen.
		'require-atomic-updates': 0,
		'prefer-const': ['error'],
		'no-var': ['error'],
		'no-new-func': ['error'],
		'import/prefer-default-export': ['error'],
		'import/first': ['error'],
		'no-array-constructor': ['error'],
		'radix': ['error'],

		// Warn only for now because fixing everything would take too much
		// refactoring, but new code should try to stick to it.
		'complexity': ['warn', { max: 10 }],

		// Checks rules of Hooks
		'react-hooks/rules-of-hooks': 'error',
		// Checks effect dependencies
		// Disable because of this: https://github.com/facebook/react/issues/16265
		// "react-hooks/exhaustive-deps": "warn",

		// -------------------------------
		// Formatting
		// -------------------------------
		'space-in-parens': ['error', 'never'],
		'space-infix-ops': ['error'],
		'curly': ['error', 'multi-line', 'consistent'],
		'semi': ['error', 'always'],
		'eol-last': ['error', 'always'],
		'quotes': ['error', 'single'],
		'indent': ['error', 'tab'],
		'comma-dangle': ['error', {
			'arrays': 'always-multiline',
			'objects': 'always-multiline',
			'imports': 'always-multiline',
			'exports': 'always-multiline',
			'functions': 'never',
		}],
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
		'multiline-comment-style': ['error', 'separate-lines'],
		'space-before-blocks': 'error',
		'spaced-comment': ['error', 'always'],
		'keyword-spacing': ['error', { 'before': true, 'after': true }],
	},
	'plugins': [
		'react',
		'@typescript-eslint',
		'react-hooks',
		'import',
	],
};
