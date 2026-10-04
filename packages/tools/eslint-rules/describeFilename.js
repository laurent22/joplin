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

// `describe.each` builds its title from the test data, so a printf placeholder
// such as "%j", or a "$variable" tag, may follow the file name.
const eachTitle = (title, allowed) => {
	const match = /^(.*?)\s*[([]?[%$]/.exec(title);
	return !!match && allowed.includes(match[1]);
};

const isDescribe = (callee) => {
	if (callee.type === 'Identifier') return callee.name === 'describe';
	// describe.each(...)(...) - the callee is itself a call expression, and
	// describe.each`...`(...) - a tagged template expression.
	if (callee.type === 'CallExpression') return isDescribe(callee.callee);
	if (callee.type === 'TaggedTemplateExpression') return isDescribe(callee.tag);
	if (callee.type === 'MemberExpression' && !callee.computed) {
		return isDescribe(callee.object);
	}
	return false;
};

const isEach = (callee) => {
	if (callee.type === 'CallExpression') return isEach(callee.callee);
	if (callee.type === 'TaggedTemplateExpression') return isEach(callee.tag);
	if (callee.type === 'MemberExpression' && !callee.computed) {
		return callee.property.name === 'each' || isEach(callee.object);
	}
	return false;
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
			dynamic: 'The describe() title should be a string literal matching the file name ("{{expected}}").',
		},
	},

	create(context) {
		const filePath = context.filename ?? context.getFilename();
		if (!/\.test\.[jt]sx?$/.test(filePath)) return {};

		const allowed = filePathTitles(filePath);
		const data = { expected: allowed[0], alternative: allowed[1] ?? allowed[0] };

		return {
			// Only top-level describe() calls - nested ones are inside a function
			// body so their ancestor chain includes a CallExpression.
			'Program > ExpressionStatement > CallExpression'(node) {
				if (!isDescribe(node.callee)) return;

				const [title] = node.arguments;
				if (!title) return;

				if (title.type !== 'Literal' || typeof title.value !== 'string') {
					context.report({ node: title, messageId: 'dynamic', data });
					return;
				}

				if (allowed.includes(title.value)) return;
				if (isEach(node.callee) && eachTitle(title.value, allowed)) return;

				context.report({ node: title, messageId: 'mismatch', data });
			},
		};
	},
};
