// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
function asyncTest(callback) {
	return async function(done) {
		try {
			await callback();
		} catch (error) {
			console.error(error);
			expect('good').toBe('not good', 'Test has thrown an exception - see above error');
		} finally {
			done();
		}
	};
}

module.exports = { asyncTest };
