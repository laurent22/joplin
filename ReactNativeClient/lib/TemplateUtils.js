const { time } = require('lib/time-utils.js');
const Mustache = require('mustache');

const TemplateUtils = {};

// new template variables can be added here
// If there are too many, this should be moved to a new file
const view = {
	date: time.formatMsToLocal(new Date().getTime(), time.dateFormat()),
	time: time.formatMsToLocal(new Date().getTime(), time.timeFormat()),
	datetime: time.formatMsToLocal(new Date().getTime()),
	custom_datetime: () =>  { return (text, render) => {
		return render(time.formatMsToLocal(new Date().getTime(), text));
	}},
}

// Mustache escapes strings (including /) with the html code by default
// This isn't useful for markdown so it's disabled
Mustache.escape = (text) => { return text; }

TemplateUtils.render = function(input) {
	return Mustache.render(input, view);
}

module.exports = TemplateUtils;
