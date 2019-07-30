const { shim } = require('lib/shim.js');
const { time } = require('lib/time-utils.js');
const Mustache = require('mustache');

const TemplateUtils = {};

// new template variables can be added here
// If there are too many, this should be moved to a new file
const view = {
	date: time.formatMsToLocal(new Date().getTime(), time.dateFormat()),
	time: time.formatMsToLocal(new Date().getTime(), time.timeFormat()),
	datetime: time.formatMsToLocal(new Date().getTime()),
	custom_datetime: () => {
		return (text, render) => {
			return render(time.formatMsToLocal(new Date().getTime(), text));
		};
	},
};

// Mustache escapes strings (including /) with the html code by default
// This isn't useful for markdown so it's disabled
Mustache.escape = text => {
	return text;
};

TemplateUtils.render = function(input) {
	return Mustache.render(input, view);
};

TemplateUtils.loadTemplates = async function(filePath) {
	let templates = [];
	let files = [];

	if (await shim.fsDriver().exists(filePath)) {
		try {
			files = await shim.fsDriver().readDirStats(filePath);
		} catch (error) {
			let msg = error.message ? error.message : '';
			msg = 'Could not read template names from ' + filePath + '\n' + msg;
			error.message = msg;
			throw error;
		}

		files.forEach(async file => {
			if (file.path.endsWith('.md')) {
				try {
					let fileString = await shim.fsDriver().readFile(filePath + '/' + file.path, 'utf-8');
					templates.push({ label: file.path, value: fileString });
				} catch (error) {
					let msg = error.message ? error.message : '';
					msg = 'Could not load template ' + file.path + '\n' + msg;
					error.message = msg;
					throw error;
				}
			}
		});
	}

	return templates;
};

module.exports = TemplateUtils;
