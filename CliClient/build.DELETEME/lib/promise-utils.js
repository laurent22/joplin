function promiseChain(chain, defaultValue = null) {
	let output = new Promise((resolve, reject) => { resolve(defaultValue); });
	for (let i = 0; i < chain.length; i++) {
		let f = chain[i];
		output = output.then(f);
	}
	return output;
}

function promiseWhile(callback) {
	let isDone = false;

	function done() {
		isDone = true;
	}

	let iterationDone = false;
	let p = callback(done).then(() => {
		iterationDone = true;
	});

	let iid = setInterval(() => {
		if (iterationDone) {
			if (isDone) {
				clearInterval(iid);
				return;
			}

			iterationDone = false;
			callback(done).then(() => {
				iterationDone = true;
			});
		}
	}, 100);
}

module.exports = { promiseChain, promiseWhile };