const SearchEngine = require('../services/searchengine/SearchEngine').default;

const script = {};

script.exec = async function() {
	await SearchEngine.instance().rebuildIndex();
};

module.exports = script;
