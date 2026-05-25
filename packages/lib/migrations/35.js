
import SearchEngine from '../services/search/SearchEngine';
const script = {};

script.exec = async function() {
	await SearchEngine.instance().rebuildIndex();
};

module.exports = script;
