const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const { time } = require('lib/time-utils.js');
const { _ } = require('lib/locale');
const DiffMatchPatch = require('diff-match-patch');

const dmp = new DiffMatchPatch();

class Revision extends BaseItem {

	static tableName() {
		return 'revisions';
	}

	static modelType() {
		return BaseModel.TYPE_REVISION;
	}

	static createPatch(oldText, newText) {
		return dmp.patch_toText(dmp.patch_make(oldText, newText));
	}

	static applyPatch(text, patch) {
		patch = dmp.patch_fromText(patch);
		const result = dmp.patch_apply(patch, text);
		if (!result || !result.length) throw new Error('Could not apply patch');
		return result[0];
	}

}

module.exports = Revision;
