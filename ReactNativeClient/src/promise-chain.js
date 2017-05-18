function promiseChain(chain) {
	let output = new Promise((resolve, reject) => { resolve(); });
	for (let i = 0; i < chain.length; i++) {
		let f = chain[i];
		output = output.then(f);
	}
	return output;
}

export { promiseChain }