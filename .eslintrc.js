module.exports = {
	'env': {
		'browser': true,
		'es6': true,
		'node': true,
	},
	'extends': ['eslint:recommended', 'prettier'],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parserOptions': {
		'ecmaVersion': 2018,
		"ecmaFeatures": {
			"jsx": true,
	    },
	    "sourceType": "module",
	},
	'rules': {
		"react/jsx-uses-react": "error",
		"react/jsx-uses-vars": "error",
		// Ignore all unused function arguments, because in some
		// case they are kept to indicate the function signature.
		"no-unused-vars": ["error", { "argsIgnorePattern": ".*" }],
		"no-constant-condition": 0,
		"no-prototype-builtins": 0,
		"prettier/prettier": "error",
		// Uncomment this to automatically remove unused requires:
		// "autofix/no-unused-vars": "error",
	},
	"plugins": [
		"react",
		"prettier",
		"autofix",
	],
};