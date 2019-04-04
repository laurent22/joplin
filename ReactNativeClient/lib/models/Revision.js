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

	static createTextPatch(oldText, newText) {
		return dmp.patch_toText(dmp.patch_make(oldText, newText));
	}

	static applyTextPatch(text, patch) {
		patch = dmp.patch_fromText(patch);
		const result = dmp.patch_apply(patch, text);
		if (!result || !result.length) throw new Error('Could not apply patch');
		return result[0];
	}

	static createObjectPatch(oldObject, newObject) {
		if (!oldObject) oldObject = {};

		const output = {
			new: {},
			deleted: [],
		};

		for (let k in newObject) {
			if (!newObject.hasOwnProperty(k)) continue;
			if (oldObject[k] === newObject[k]) continue;
			output.new[k] = newObject[k];
		}

		for (let k in oldObject) {
			if (!oldObject.hasOwnProperty(k)) continue;
			if (!(k in newObject)) output.deleted.push(k);
		}

		return JSON.stringify(output);
	}

	static applyObjectPatch(object, patch) {
		patch = JSON.parse(patch);
		const output = Object.assign({}, object);
		
		for (let k in patch.new) {
			output[k] = patch.new[k];
		}

		for (let i = 0; i < patch.deleted.length; i++) {
			delete output[patch.deleted[i]];
		}

		return output;
	}

	static latestRevision(itemType, itemId) {
		return this.modelSelectOne('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? ORDER BY updated_time DESC LIMIT 1', [
			itemType,
			itemId,
		]);
	}

	static allByType(itemType, itemId) {
		return this.modelSelectAll('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? ORDER BY updated_time ASC', [
			itemType,
			itemId,
		]);
	}

	// Note: revs must be sorted by update_time ASC (as returned by allByType)
	static async mergeDiffs(revision, revs = null) {
		if (!revs) {
			revs = await this.modelSelectAll('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? AND updated_time <= ? ORDER BY updated_time ASC', [
				revision.item_type,
				revision.item_id,
				revision.updated_time,
			]);
		}

		const output = {
			title: '',
			body: '',
			metadata: {},
		};

		for (let i = 0; i < revs.length; i++) {
			const rev = revs[i];
			if (rev.updated_time > revision.updated_time) break;

			output.title = this.applyTextPatch(output.title, rev.title_diff);
			output.body = this.applyTextPatch(output.body, rev.body_diff);
			output.metadata = this.applyObjectPatch(output.metadata, rev.metadata_diff);
		}

		return output;
	}

	static async deleteOldRevisions(ttl) {
		const cutOffDate = Date.now() - ttl;
		return this.db().exec('DELETE FROM revisions WHERE updated_time < ?', [cutOffDate]);
	}

}

module.exports = Revision;
