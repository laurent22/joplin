const Setting = require('../models/Setting').default;

const script = {};

script.exec = async function() {
	Setting.setValue('markdown.plugin.softbreaks', Setting.value('markdown.softbreaks'));
	Setting.setValue('markdown.plugin.typographer', Setting.value('markdown.typographer'));
};

module.exports = script;
