const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const DiffMatchPatch = require('diff-match-patch');
const ArrayUtils = require('lib/ArrayUtils.js');
const JoplinError = require('lib/JoplinError');
const { sprintf } = require('sprintf-js');

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

	static patchStats(patch) {
		if (typeof patch === 'object') throw new Error('Not implemented');

		const countChars = diffLine => {
			return unescape(diffLine).length - 1;
		};

		const lines = patch.split('\n');
		let added = 0;
		let removed = 0;

		for (const line of lines) {
			if (line.indexOf('-') === 0) {
				removed += countChars(line);
				continue;
			}

			if (line.indexOf('+') === 0) {
				added += countChars(line);
				continue;
			}
		}

		return {
			added: added,
			removed: removed,
		};
	}

	static revisionPatchStatsText(rev) {
		const titleStats = this.patchStats(rev.title_diff);
		const bodyStats = this.patchStats(rev.body_diff);
		const total = {
			added: titleStats.added + bodyStats.added,
			removed: titleStats.removed + bodyStats.removed,
		};

		const output = [];
		if (total.removed) output.push(`-${total.removed}`);
		output.push(`+${total.added}`);
		return output.join(', ');
	}

	static async countRevisions(itemType, itemId) {
		const r = await this.db().selectOne('SELECT count(*) as total FROM revisions WHERE item_type = ? AND item_id = ?', [itemType, itemId]);

		return r ? r.total : 0;
	}

	static latestRevision(itemType, itemId) {
		return this.modelSelectOne('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? ORDER BY item_updated_time DESC LIMIT 1', [itemType, itemId]);
	}

	static allByType(itemType, itemId) {
		return this.modelSelectAll('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? ORDER BY item_updated_time ASC', [itemType, itemId]);
	}

	static async itemsWithRevisions(itemType, itemIds) {
		if (!itemIds.length) return [];
		const rows = await this.db().selectAll(`SELECT distinct item_id FROM revisions WHERE item_type = ? AND item_id IN ("${itemIds.join('","')}")`, [itemType]);

		return rows.map(r => r.item_id);
	}

	static async itemsWithNoRevisions(itemType, itemIds) {
		const withRevs = await this.itemsWithRevisions(itemType, itemIds);
		const output = [];
		for (let i = 0; i < itemIds.length; i++) {
			if (withRevs.indexOf(itemIds[i]) < 0) output.push(itemIds[i]);
		}
		return ArrayUtils.unique(output);
	}

	static moveRevisionToTop(revision, revs) {
		let targetIndex = -1;
		for (let i = revs.length - 1; i >= 0; i--) {
			const rev = revs[i];
			if (rev.id === revision.id) {
				targetIndex = i;
				break;
			}
		}

		if (targetIndex < 0) throw new Error(`Could not find revision: ${revision.id}`);

		if (targetIndex !== revs.length - 1) {
			revs = revs.slice();
			const toTop = revs[targetIndex];
			revs.splice(targetIndex, 1);
			revs.push(toTop);
		}

		return revs;
	}

	// Note: revs must be sorted by update_time ASC (as returned by allByType)
	static async mergeDiffs(revision, revs = null) {
		if (!('encryption_applied' in revision) || !!revision.encryption_applied) throw new JoplinError('Target revision is encrypted', 'revision_encrypted');

		if (!revs) {
			revs = await this.modelSelectAll('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? AND item_updated_time <= ? ORDER BY item_updated_time ASC', [revision.item_type, revision.item_id, revision.item_updated_time]);
		} else {
			revs = revs.slice();
		}

		// Handle rare case where two revisions have been created at exactly the same millisecond
		// Also handle even rarer case where a rev and its parent have been created at the
		// same milliseconds. All code below expects target revision to be on top.
		revs = this.moveRevisionToTop(revision, revs);

		const output = {
			title: '',
			body: '',
			metadata: {},
		};

		// Build up the list of revisions that are parents of the target revision.
		const revIndexes = [revs.length - 1];
		let parentId = revision.parent_id;
		for (let i = revs.length - 2; i >= 0; i--) {
			const rev = revs[i];
			if (rev.id !== parentId) continue;
			parentId = rev.parent_id;
			revIndexes.push(i);
		}
		revIndexes.reverse();

		for (const revIndex of revIndexes) {
			const rev = revs[revIndex];
			if (rev.encryption_applied) throw new JoplinError(sprintf('Revision "%s" is encrypted', rev.id), 'revision_encrypted');
			output.title = this.applyTextPatch(output.title, rev.title_diff);
			output.body = this.applyTextPatch(output.body, rev.body_diff);
			output.metadata = this.applyObjectPatch(output.metadata, rev.metadata_diff);
		}

		return output;
	}

	static async deleteOldRevisions(ttl) {
		// When deleting old revisions, we need to make sure that the oldest surviving revision
		// is a "merged" one (as opposed to a diff from a now deleted revision). So every time
		// we deleted a revision, we need to find if there's a corresponding surviving revision
		// and modify that revision into a "merged" one.

		const cutOffDate = Date.now() - ttl;
		const revisions = await this.modelSelectAll('SELECT * FROM revisions WHERE item_updated_time < ? ORDER BY item_updated_time DESC', [cutOffDate]);
		const doneItems = {};

		for (const rev of revisions) {
			const doneKey = `${rev.item_type}_${rev.item_id}`;
			if (doneItems[doneKey]) continue;

			const keptRev = await this.modelSelectOne('SELECT * FROM revisions WHERE item_updated_time >= ? AND item_type = ? AND item_id = ? ORDER BY item_updated_time ASC LIMIT 1', [cutOffDate, rev.item_type, rev.item_id]);

			try {
				const deleteQueryCondition = 'item_updated_time < ? AND item_id = ?';
				const deleteQueryParams = [cutOffDate, rev.item_id];
				const deleteQuery = { sql: `DELETE FROM revisions WHERE ${deleteQueryCondition}`, params: deleteQueryParams };

				if (!keptRev) {
					const hasEncrypted = await this.modelSelectOne(`SELECT * FROM revisions WHERE encryption_applied = 1 AND ${deleteQueryCondition}`, deleteQueryParams);
					if (hasEncrypted) throw new JoplinError('One of the revision to be deleted is encrypted', 'revision_encrypted');
					await this.db().transactionExecBatch([deleteQuery]);
				} else {
					// Note: we don't need to check for encrypted rev here because
					// mergeDiff will already throw the revision_encrypted exception
					// if a rev is encrypted.
					const merged = await this.mergeDiffs(keptRev);

					const queries = [deleteQuery, { sql: 'UPDATE revisions SET title_diff = ?, body_diff = ?, metadata_diff = ? WHERE id = ?', params: [this.createTextPatch('', merged.title), this.createTextPatch('', merged.body), this.createObjectPatch({}, merged.metadata), keptRev.id] }];

					await this.db().transactionExecBatch(queries);
				}
			} catch (error) {
				if (error.code === 'revision_encrypted') {
					this.logger().info(`Aborted deletion of old revisions for item ${rev.item_id} because one of the revisions is still encrypted`, error);
				} else {
					throw error;
				}
			}

			doneItems[doneKey] = true;
		}
	}

	static async revisionExists(itemType, itemId, updatedTime) {
		const existingRev = await Revision.latestRevision(itemType, itemId);
		return existingRev && existingRev.item_updated_time === updatedTime;
	}
}

module.exports = Revision;
