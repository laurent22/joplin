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
	},
	'rules': {
		"react/jsx-uses-react": "error",
		"react/jsx-uses-vars": "error",
		"no-unused-vars": ["error", { "argsIgnorePattern": "event|reject|resolve|prevState|snapshot|prevProps" }],
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