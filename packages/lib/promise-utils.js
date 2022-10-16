function promiseChain(chain, defaultValue = null) {
	let output = new Promise((resolve) => {
		resolve(defaultValue);
	});
	for (let i = 0; i < chain.length; i++) {
		const f = chain[i];
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
		output = output.then(f);
	}
	return output;
}

module.exports = { promiseChain };
