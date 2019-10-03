module.exports = {
	"overrides": [
		{
			"files": ["tests/**/*.js"],
			'rules': {
				// Ignore all unused function arguments, because in some
				// case they are kept to indicate the function signature.
				"no-unused-vars": ["error", { "argsIgnorePattern": ".*" }],
				"@typescript-eslint/no-unused-vars": 0,
			}
		},
	],
};