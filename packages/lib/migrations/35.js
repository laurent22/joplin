const SearchEngine = require('../services/search/SearchEngine').default;

const script = {};

script.exec = async function() {
	await SearchEngine.instance().rebuildIndex();
};

module.exports = script;
