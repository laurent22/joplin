function traceMethodCalls(obj) {
	const handler = {
		get(_target, propKey, _receiver) {
			if (propKey === '$$typeof') return 'object';
			throw new Error(`Trying to access member of mocked fs package: \`fs.${propKey}\``);
		},
	};
	return new Proxy(obj, handler);
}

const mockFs = {};

module.exports = traceMethodCalls(mockFs);
