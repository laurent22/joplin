function promiseChain(chain, defaultValue = null) {
	let output = new Promise((resolve) => {
		resolve(defaultValue);
	});
	for (let i = 0; i < chain.length; i++) {
		const f = chain[i];
		output = output.then(f);
	}
	return output;
}

module.exports = { promiseChain };
