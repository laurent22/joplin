"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const BaseItem_1 = require("./BaseItem");
const DiffMatchPatch = require('diff-match-patch');
const ArrayUtils = require("../ArrayUtils");
const JoplinError_1 = require("../JoplinError");
const time_1 = require("../time");
const { sprintf } = require('sprintf-js');
const dmp = new DiffMatchPatch();
class Revision extends BaseItem_1.default {
    static tableName() {
        return 'revisions';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_REVISION;
    }
    static createTextPatchLegacy(oldText, newText) {
        return dmp.patch_toText(dmp.patch_make(oldText, newText));
    }
    static createTextPatch(oldText, newText) {
        // Note that, once parsed, the resulting object will not exactly be like
        // a dmp patch object. This is because the library overrides the
        // toString() prototype function of the dmp patch object, and uses it in
        // certain functions. For example, in patch_toText(). It means that when
        // calling patch_toText() with an object that has been JSON-stringified
        // and JSON-parsed, it will not work.
        //
        // This is mostly fine for our purpose. It's only a problem in
        // Revision.patchStats() because it was based on parsing the GNU diff
        // as returned by patch_toText().
        return JSON.stringify(dmp.patch_make(oldText, newText));
    }
    static applyTextPatchLegacy(text, patch) {
        patch = dmp.patch_fromText(patch);
        const result = dmp.patch_apply(patch, text);
        if (!result || !result.length)
            throw new Error('Could not apply patch');
        return result[0];
    }
    static isLegacyPatch(patch) {
        return patch && patch.indexOf('@@') === 0;
    }
    static isNewPatch(patch) {
        if (!patch)
            return true;
        return patch.indexOf('[{') === 0 || patch === '[]';
    }
    static applyTextPatch(text, patch) {
        if (this.isLegacyPatch(patch)) {
            return this.applyTextPatchLegacy(text, patch);
        }
        else {
            // An empty patch should be '[]', but legacy data may be just "".
            // However an empty string would make JSON.parse fail so we set it
            // to '[]'.
            const result = dmp.patch_apply(this.parsePatch(patch), text);
            if (!result || !result.length)
                throw new Error('Could not apply patch');
            return result[0];
        }
    }
    static isEmptyRevision(rev) {
        if (this.isLegacyPatch(rev.title_diff) && rev.title_diff)
            return false;
        if (this.isLegacyPatch(rev.body_diff) && rev.body_diff)
            return false;
        if (this.isNewPatch(rev.title_diff) && rev.title_diff && rev.title_diff !== '[]')
            return false;
        if (this.isNewPatch(rev.body_diff) && rev.body_diff && rev.body_diff !== '[]')
            return false;
        const md = rev.metadata_diff ? JSON.parse(rev.metadata_diff) : {};
        if (md.new && Object.keys(md.new).length)
            return false;
        if (md.deleted && Object.keys(md.deleted).length)
            return false;
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static createObjectPatch(oldObject, newObject) {
        if (!oldObject)
            oldObject = {};
        const output = {
            new: {},
            deleted: [],
        };
        for (const k in newObject) {
            if (!newObject.hasOwnProperty(k))
                continue;
            if (oldObject[k] === newObject[k])
                continue;
            output.new[k] = newObject[k];
        }
        for (const k in oldObject) {
            if (!oldObject.hasOwnProperty(k))
                continue;
            if (!(k in newObject))
                output.deleted.push(k);
        }
        return JSON.stringify(output);
    }
    // We need to sanitise the object patch because it seems some are broken and
    // may contain new lines: https://github.com/laurent22/joplin/issues/6209
    static sanitizeObjectPatch(patch) {
        return patch.replace(/[\n\r]/g, '');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static applyObjectPatch(object, patch) {
        const parsedPatch = JSON.parse(this.sanitizeObjectPatch(patch));
        const output = Object.assign({}, object);
        for (const k in parsedPatch.new) {
            output[k] = parsedPatch.new[k];
        }
        for (let i = 0; i < parsedPatch.deleted.length; i++) {
            delete output[parsedPatch.deleted[i]];
        }
        return output;
    }
    // Turn a new-style patch into an approximation of a GNU diff format.
    // Approximation, because the only goal is to put "+" or "-" before each
    // line, so that it can be processed by patchStats().
    static newPatchToDiffFormat(patch) {
        const changeList = [];
        const patchArray = this.parsePatch(patch);
        for (const patchItem of patchArray) {
            for (const d of patchItem.diffs) {
                if (d[0] !== 0)
                    changeList.push(d[0] < 0 ? `-${d[1].replace(/[\n\r]/g, ' ')}` : `+${d[1].trim().replace(/[\n\r]/g, ' ')}`);
            }
        }
        return changeList.join('\n');
    }
    static patchStats(patch) {
        if (typeof patch === 'object')
            throw new Error('Not implemented');
        if (this.isNewPatch(patch)) {
            try {
                patch = this.newPatchToDiffFormat(patch);
            }
            catch (error) {
                // Normally it should work but if it doesn't we don't want it to
                // crash the app since it's just presentational. But log an
                // error so that it can eventually be fixed.
                console.error('Could not generate diff:', error, patch);
                return { added: 0, removed: 0 };
            }
        }
        const countChars = (diffLine) => {
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
        if (total.removed)
            output.push(`-${total.removed}`);
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
        if (!itemIds.length)
            return [];
        const rows = await this.db().selectAll(`SELECT distinct item_id FROM revisions WHERE item_type = ? AND item_id IN (${this.escapeIdsForSql(itemIds)})`, [itemType]);
        return rows.map((r) => r.item_id);
    }
    static async itemsWithNoRevisions(itemType, itemIds) {
        const withRevs = await this.itemsWithRevisions(itemType, itemIds);
        const output = [];
        for (let i = 0; i < itemIds.length; i++) {
            if (withRevs.indexOf(itemIds[i]) < 0)
                output.push(itemIds[i]);
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
        if (targetIndex < 0)
            throw new Error(`Could not find revision: ${revision.id}`);
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
        if (!('encryption_applied' in revision) || !!revision.encryption_applied)
            throw new JoplinError_1.default('Target revision is encrypted', 'revision_encrypted');
        if (!revs) {
            revs = await this.modelSelectAll('SELECT * FROM revisions WHERE item_type = ? AND item_id = ? AND item_updated_time <= ? ORDER BY item_updated_time ASC', [revision.item_type, revision.item_id, revision.item_updated_time]);
        }
        else {
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
            if (rev.id !== parentId)
                continue;
            parentId = rev.parent_id;
            revIndexes.push(i);
        }
        revIndexes.reverse();
        for (const revIndex of revIndexes) {
            const rev = revs[revIndex];
            if (rev.encryption_applied)
                throw new JoplinError_1.default(sprintf('Revision "%s" is encrypted', rev.id), 'revision_encrypted');
            output.title = this.applyTextPatch(output.title, rev.title_diff);
            output.body = this.applyTextPatch(output.body, rev.body_diff);
            try {
                output.metadata = this.applyObjectPatch(output.metadata, rev.metadata_diff);
            }
            catch (error) {
                error.message = `Revision ${rev.id}: Could not apply patch: ${error.message}: ${rev.metadata_diff}`;
                throw error;
            }
        }
        return output;
    }
    static async deleteOldRevisions(ttl) {
        // When deleting old revisions, we need to make sure that the oldest surviving revision
        // is a "merged" one (as opposed to a diff from a now deleted revision). So every time
        // we deleted a revision, we need to find if there's a corresponding surviving revision
        // and modify that revision into a "merged" one.
        const cutOffDate = Date.now() - ttl;
        const allOldRevisions = await this.modelSelectAll('SELECT * FROM revisions WHERE item_updated_time < ? ORDER BY item_updated_time DESC', [cutOffDate]);
        const itemIdToOldRevisions = new Map();
        for (const rev of allOldRevisions) {
            const itemId = rev.item_id;
            if (!itemIdToOldRevisions.has(itemId)) {
                itemIdToOldRevisions.set(itemId, []);
            }
            itemIdToOldRevisions.get(itemId).push(rev);
        }
        const deleteOldRevisionsForItem = async (itemType, itemId, oldRevisions) => {
            const keptRev = await this.modelSelectOne('SELECT * FROM revisions WHERE item_updated_time >= ? AND item_type = ? AND item_id = ? ORDER BY item_updated_time ASC LIMIT 1', [cutOffDate, itemType, itemId]);
            const queries = [];
            if (!keptRev) {
                const hasEncrypted = await this.modelSelectOne('SELECT * FROM revisions WHERE encryption_applied = 1 AND item_updated_time < ? AND item_id = ?', [cutOffDate, itemId]);
                if (hasEncrypted) {
                    throw new JoplinError_1.default('One of the revision to be deleted is encrypted', 'revision_encrypted');
                }
            }
            else {
                // Note: we don't need to check for encrypted rev here because
                // mergeDiff will already throw the revision_encrypted exception
                // if a rev is encrypted.
                const merged = await this.mergeDiffs(keptRev);
                const titleDiff = this.createTextPatch('', merged.title);
                const bodyDiff = this.createTextPatch('', merged.body);
                const metadataDiff = this.createObjectPatch({}, merged.metadata);
                queries.push({
                    sql: 'UPDATE revisions SET title_diff = ?, body_diff = ?, metadata_diff = ?, updated_time = ? WHERE id = ?',
                    params: [titleDiff, bodyDiff, metadataDiff, time_1.default.unixMs(), keptRev.id],
                });
            }
            await this.batchDelete(oldRevisions.map(item => item.id), { sourceDescription: 'Revision.deleteOldRevisions' });
            if (queries.length) {
                await this.db().transactionExecBatch(queries);
            }
        };
        for (const [itemId, oldRevisions] of itemIdToOldRevisions.entries()) {
            if (!oldRevisions.length) {
                throw new Error('Invalid state: There must be at least one old revision per item to be processed.');
            }
            const latestOldRevision = oldRevisions[oldRevisions.length - 1];
            try {
                await deleteOldRevisionsForItem(latestOldRevision.item_type, itemId, oldRevisions);
            }
            catch (error) {
                if (error.code === 'revision_encrypted') {
                    this.logger().info(`Aborted deletion of old revisions for item "${itemId}" (latest old rev "${latestOldRevision.id}") because one of the revisions is still encrypted`, error);
                }
                else {
                    throw error;
                }
            }
        }
    }
    static async deleteHistoryForNote(noteIds, options) {
        const ids = Array.isArray(noteIds) ? noteIds : [noteIds];
        const revisions = await this.modelSelectAll(`SELECT id FROM revisions WHERE item_type = ? AND item_id in (${this.escapeIdsForSql(ids)}) ORDER BY item_updated_time DESC`, [BaseModel_1.ModelType.Note]);
        await this.batchDelete(revisions.map(item => item.id), options);
    }
    static async revisionExists(itemType, itemId, updatedTime) {
        const existingRev = await Revision.latestRevision(itemType, itemId);
        return existingRev && existingRev.item_updated_time === updatedTime;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static parsePatch(patch) {
        return patch ? JSON.parse(patch) : [];
    }
}
exports.default = Revision;
