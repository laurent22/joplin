module.exports = {
	"overrides": [
		{
			"files": ["**/*.ts"],
			'rules': {
				// This is handled by the compiler
				"no-unused-vars": 0,
				"func-call-spacing": "off",
				"@typescript-eslint/func-call-spacing": ["error"]
			}
		},
	],
};