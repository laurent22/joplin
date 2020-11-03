const SearchEngine = require('../services/searchengine/SearchEngine');

const script = {};

script.exec = async function() {
	await SearchEngine.instance().rebuildIndex();
};

module.exports = script;
