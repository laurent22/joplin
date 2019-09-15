const testUtils = {};

// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
testUtils.asyncTest = function(callback) {
	return async function(done) {
		try {
			await callback();
		} catch (error) {
			console.error(error);
		} finally {
			done();
		}
	};
};

module.exports = testUtils;
