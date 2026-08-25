const { basename, sep } = require('path');

// Enforces that the top-level `describe()` title in a test file matches the
// file name, or a path suffix ending with that file name. For example, for
// `packages/lib/models/Tag.test.ts`, valid titles are "Tag", "models/Tag" or
// "lib/models/Tag".

const testFileSuffix = /\.test$/;

const filePathTitles = (filePath) => {
	const parts = filePath.split(sep);
	parts[parts.length - 1] = basename(parts[parts.length - 1]).replace(/\.[^.]+$/, '').replace(testFileSuffix, '');

	const output = [];
	for (let i = parts.length - 1; i >= 0; i--) {
		output.push(parts.slice(i).join('/'));
	}
	return output;
};

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Require the top-level describe() title to match the test file name or a path suffix to it',
		},
		schema: [],
		messages: {
			mismatch: 'The describe() title should be "{{expected}}", or a longer path suffix to the file (eg. "{{alternative}}").',
		},
	},

	create(context) {
		const filePath = context.filename ?? context.getFilename();
		if (!/\.test\.[jt]sx?$/.test(filePath)) return {};

		const allowed = filePathTitles(filePath);

		return {
			// Only top-level describe() calls - nested ones are inside a function
			// body so their ancestor chain includes a CallExpression.
			'Program > ExpressionStatement > CallExpression'(node) {
				if (node.callee.type !== 'Identifier' || node.callee.name !== 'describe') return;
				const [title] = node.arguments;
				if (!title || title.type !== 'Literal' || typeof title.value !== 'string') return;
				if (allowed.includes(title.value)) return;

				context.report({
					node: title,
					messageId: 'mismatch',
					data: { expected: allowed[0], alternative: allowed[1] ?? allowed[0] },
				});
			},
		};
	},
};
