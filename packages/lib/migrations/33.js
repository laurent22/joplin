const SearchEngine = require('../services/searchengine/SearchEngine').default;

const script = {};

script.exec = async function() {
	try {
		await SearchEngine.instance().rebuildIndex();
	} catch {
		// Probably running tests.
	}
};

module.exports = script;
