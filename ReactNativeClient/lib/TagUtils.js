
const Tag = require('lib/models/Tag.js');

async function applyTagDiff(noteIds, startTagTitles, endTagTitles) {

	const addTags = endTagTitles.filter(value => !startTagTitles.includes(value));
	const delTags = startTagTitles.filter(value => !endTagTitles.includes(value));

	// apply the tag additions and deletions to each selected note
	for (let i = 0; i < noteIds.length; i++) {
		const tags = await Tag.tagsByNoteId(noteIds[i]);
		let tagTitles = tags.map(a => { return a.title; });
		tagTitles = tagTitles.concat(addTags);
		tagTitles = tagTitles.filter(value => !delTags.includes(value));

		await Tag.setNoteTagsByTitles(noteIds[i], tagTitles);
	}
}

module.exports = { applyTagDiff };
