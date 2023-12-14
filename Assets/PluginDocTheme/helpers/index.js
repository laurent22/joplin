function camelCaseToDots(s) {
	const output = [];
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === c.toLowerCase() || i === 0) {
			output.push(c.toLowerCase());
		} else {
			output.push('.');
			output.push(c.toLowerCase());
		}
	}

	return output.join('');
}

module.exports = {
	jpFormatClassName: function(className) {
		if (className.indexOf('Joplin') !== 0 || className.indexOf(' ') >= 0) return className;

		const p = className.substr(6);
		if (p === '') return 'joplin';

		return `joplin.${camelCaseToDots(p)
			.replace(/menu\.items/, 'menuItems')
			.replace(/toolbar\.buttons/, 'toolbarButtons')
			.replace(/note\.list/, 'noteList')
			.replace(/content\.scripts/, 'contentScripts')}`;
	},

	jpIsAllowedGroup: function(name) {
		return name !== 'Constructors';
	},

	jsIsNotKindVariable: function(classes) {
		if (!classes) return true;
		return classes.indexOf('tsd-kind-variable') < 0;
	},
};
