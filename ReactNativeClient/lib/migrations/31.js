const Tag = require('lib/models/Tag');

const script = {};

script.exec = async function() {
	const tags = await Tag.all();

	// In case tags with `/` exist, we want to transform them into nested tags
	for (let i = 0; i < tags.length; i++) {
		const tag = Object.assign({}, tags[i]);
		// Remove any starting sequence of '/'
		tag.title = tag.title.replace(/^\/*/, '');
		// Remove any ending sequence of '/'
		tag.title = tag.title.replace(/\/*$/, '');
		// Trim any sequence of '/'+ to a single '/'
		tag.title = tag.title.replace(/\/\/+/g, '/');

		const tag_title = tag.title;
		let other = await Tag.loadByTitle(tag_title);
		let count = 1;
		// In case above trimming creates duplicate tags
		// then add a counter to the dupes
		while ((other && other.id != tag.id) && count < 1000) {
			tag.title = `${tag_title}-${count}`;
			other = await Tag.loadByTitle(tag.title);
			count++;
		}

		await Tag.saveNested(tag, tag.title);
	}
};

module.exports = script;
