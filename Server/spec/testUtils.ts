// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
export const asyncTest = function(callback:Function) {
	return async function(done:Function) {
		try {
			await callback();
		} catch (error) {
			console.error(error);
		} finally {
			done();
		}
	};
};
