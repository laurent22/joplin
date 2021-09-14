const Setting = require('lib/models/Setting');

const script = {};

script.exec = async function() {
	Setting.setValue('markdown.plugin.softbreaks', Setting.value('markdown.softbreaks'));
	Setting.setValue('markdown.plugin.typographer', Setting.value('markdown.typographer'));
};

module.exports = script;
