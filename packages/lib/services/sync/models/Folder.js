"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../services/database/types");
const BaseModel_1 = require("../BaseModel");
const time_1 = require("../time");
const locale_1 = require("../locale");
const Note_1 = require("./Note");
const database_1 = require("../database");
const BaseItem_1 = require("./BaseItem");
const Resource_1 = require("./Resource");
const reducer_1 = require("../services/share/reducer");
const Logger_1 = require("@joplin/utils/Logger");
const syncDebugLog_1 = require("../services/synchronizer/syncDebugLog");
const ActionLogger_1 = require("../utils/ActionLogger");
const trash_1 = require("../services/trash");
const getConflictFolderId_1 = require("./utils/getConflictFolderId");
const getTrashFolderId_1 = require("../services/trash/getTrashFolderId");
const getCollator_1 = require("./utils/getCollator");
const { substrWithEllipsis } = require('../string-utils.js');
const logger = Logger_1.default.create('models/Folder');
class Folder extends BaseItem_1.default {
    static tableName() {
        return 'folders';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_FOLDER;
    }
    static newFolder() {
        return {
            id: null,
            title: '',
        };
    }
    static fieldToLabel(field) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const fieldsToLabels = {
            title: (0, locale_1._)('title'),
            last_note_user_updated_time: (0, locale_1._)('updated date'),
        };
        return field in fieldsToLabels ? fieldsToLabels[field] : field;
    }
    static async notes(parentId, options = null) {
        options = Object.assign({ includeConflicts: false }, options);
        const where = ['parent_id = ?'];
        if (!options.includeConflicts) {
            where.push('is_conflict = 0');
        }
        if (!options.includeDeleted) {
            where.push('deleted_time = 0');
        }
        return this.modelSelectAll(`SELECT ${this.selectFields(options)} FROM notes WHERE ${where.join(' AND ')}`, [parentId]);
    }
    static async noteIds(parentId, options = null) {
        const notes = await this.notes(parentId, Object.assign({ fields: ['id'] }, options));
        return notes.map(n => n.id);
    }
    static async subFolderIds(parentId) {
        const rows = await this.db().selectAll('SELECT id FROM folders WHERE parent_id = ?', [parentId]);
        return rows.map((r) => r.id);
    }
    static async noteCount(parentId) {
        const r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 0 AND parent_id = ?', [parentId]);
        return r ? r.total : 0;
    }
    static markNotesAsConflict(parentId) {
        const query = database_1.default.updateQuery('notes', { is_conflict: 1 }, { parent_id: parentId });
        return this.db().exec(query);
    }
    static byId(items, id) {
        if (id === (0, getTrashFolderId_1.default)())
            return (0, trash_1.getTrashFolder)();
        return super.byId(items, id);
    }
    static async deleteAllByShareId(shareId, deleteOptions = null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const tableNameToClasses = {
            'folders': Folder,
            'notes': Note_1.default,
            'resources': Resource_1.default,
        };
        for (const tableName of ['folders', 'notes', 'resources']) {
            const ItemClass = tableNameToClasses[tableName];
            const rows = await this.db().selectAll(`SELECT id FROM ${tableName} WHERE share_id = ?`, [shareId]);
            const ids = rows.map(r => r.id);
            await ItemClass.batchDelete(ids, deleteOptions);
        }
    }
    static async delete(folderId, options) {
        options = Object.assign({ deleteChildren: true }, options);
        if (folderId === (0, getTrashFolderId_1.default)())
            throw new Error('The trash folder cannot be deleted');
        const toTrash = !!options.toTrash;
        const folder = await Folder.load(folderId);
        if (!folder)
            return; // noop
        const actionLogger = ActionLogger_1.default.from(options.sourceDescription);
        actionLogger.addDescription(`folder title: ${JSON.stringify(folder.title)}`);
        options.sourceDescription = actionLogger;
        if (options.deleteChildren) {
            const childrenDeleteOptions = {
                disableReadOnlyCheck: options.disableReadOnlyCheck,
                sourceDescription: actionLogger,
                deleteChildren: true,
                toTrash,
            };
            const noteIds = await Folder.noteIds(folderId);
            await Note_1.default.batchDelete(noteIds, childrenDeleteOptions);
            const subFolderIds = await Folder.subFolderIds(folderId);
            for (let i = 0; i < subFolderIds.length; i++) {
                await Folder.delete(subFolderIds[i], childrenDeleteOptions);
            }
        }
        if (toTrash) {
            const newFolder = { id: folderId, deleted_time: Date.now() };
            if ('toTrashParentId' in options)
                newFolder.parent_id = options.toTrashParentId;
            if (options.toTrashParentId === newFolder.id)
                throw new Error('Parent ID cannot be the same as ID');
            await this.save(newFolder);
        }
        else {
            await super.delete(folderId, options);
        }
        this.dispatch({
            type: 'FOLDER_DELETE',
            id: folderId,
        });
    }
    static conflictFolderTitle() {
        return (0, locale_1._)('Conflicts');
    }
    static conflictFolderId() {
        return (0, getConflictFolderId_1.default)();
    }
    static conflictFolder() {
        const now = Date.now();
        return {
            type_: this.TYPE_FOLDER,
            id: this.conflictFolderId(),
            parent_id: '',
            title: this.conflictFolderTitle(),
            updated_time: now,
            user_updated_time: now,
            share_id: '',
            is_shared: 0,
            deleted_time: 0,
        };
    }
    // Checks for invalid state -- whether startId or its parents is part of a cycle
    // in the folder graph (which should be a tree).
    static checkForFolderHierarchyCycle_(idToFolder, startId) {
        let folderId = startId;
        const seenIds = new Set();
        for (; idToFolder[folderId]; folderId = idToFolder[folderId].parent_id) {
            if (seenIds.has(folderId)) {
                return true;
            }
            seenIds.add(folderId);
        }
        return false;
    }
    // Calculates note counts for all folders and adds the note_count attribute to each folder
    // Note: this only calculates the overall number of nodes for this folder and all its descendants
    static async addNoteCounts(folders, includeCompletedTodos = true) {
        const foldersById = {};
        for (const f of folders) {
            foldersById[f.id] = f;
            if (this.conflictFolderId() === f.id) {
                foldersById[f.id].note_count = await Note_1.default.conflictedCount();
            }
            else {
                foldersById[f.id].note_count = 0;
            }
        }
        const where = [
            'is_conflict = 0',
            'notes.deleted_time = 0',
        ];
        if (!includeCompletedTodos)
            where.push('(notes.is_todo = 0 OR notes.todo_completed = 0)');
        const sql = `
			SELECT folders.id as folder_id, count(notes.parent_id) as note_count 
			FROM folders LEFT JOIN notes ON notes.parent_id = folders.id
			WHERE ${where.join(' AND ')}
			GROUP BY folders.id
		`;
        const noteCounts = await this.db().selectAll(sql);
        for (const noteCount of noteCounts) {
            let parentId = noteCount.folder_id;
            let i = 0;
            let checkedForCycle = false;
            do {
                // Handle invalid state, preventing infinite loops -- check whether the current
                // folder has itself as a parent.
                if (i++ > 100 && !checkedForCycle) {
                    if (Folder.checkForFolderHierarchyCycle_(foldersById, parentId)) {
                        logger.warn(`Invalid state: Folder ${parentId} has itself as a parent.`);
                        break;
                    }
                    checkedForCycle = true;
                }
                const folder = foldersById[parentId];
                if (!folder)
                    break; // https://github.com/laurent22/joplin/issues/2079
                folder.note_count = (folder.note_count || 0) + noteCount.note_count;
                // Should not happen anymore but just to be safe, add the check below
                // https://github.com/laurent22/joplin/issues/3334
                if (folder.id === folder.parent_id)
                    break;
                parentId = folder.parent_id;
            } while (parentId);
        }
    }
    // Folders that contain notes that have been modified recently go on top.
    // The remaining folders, that don't contain any notes are sorted by their own user_updated_time
    static async orderByLastModified(folders, dir = 'DESC') {
        dir = dir.toUpperCase();
        const sql = 'select parent_id, max(user_updated_time) content_updated_time from notes where parent_id != \'\' group by parent_id';
        const rows = await this.db().selectAll(sql);
        const folderIdToTime = {};
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            folderIdToTime[row.parent_id] = row.content_updated_time;
        }
        const findFolderParent = (folderId) => {
            const folder = BaseModel_1.default.byId(folders, folderId);
            if (!folder)
                return null; // For the rare case of notes that are associated with a no longer existing folder
            if (!folder.parent_id)
                return null;
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].id === folder.parent_id)
                    return folders[i];
            }
            // In some rare cases, some folders may not have a parent, for example
            // if it has not been downloaded via sync yet.
            // https://github.com/laurent22/joplin/issues/2088
            return null;
        };
        const applyChildTimeToParent = (folderId) => {
            const parent = findFolderParent(folderId);
            if (!parent)
                return;
            if (folderIdToTime[parent.id] && folderIdToTime[parent.id] >= folderIdToTime[folderId]) {
                // Don't change so that parent has the same time as the last updated child
            }
            else {
                folderIdToTime[parent.id] = folderIdToTime[folderId];
            }
            applyChildTimeToParent(parent.id);
        };
        for (const folderId in folderIdToTime) {
            if (!folderIdToTime.hasOwnProperty(folderId))
                continue;
            applyChildTimeToParent(folderId);
        }
        const mod = dir === 'DESC' ? +1 : -1;
        const output = folders.slice();
        output.sort((a, b) => {
            const aTime = folderIdToTime[a.id] ? folderIdToTime[a.id] : a.user_updated_time;
            const bTime = folderIdToTime[b.id] ? folderIdToTime[b.id] : b.user_updated_time;
            if (aTime < bTime)
                return +1 * mod;
            if (aTime > bTime)
                return -1 * mod;
            return 0;
        });
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static handleTitleNaturalSorting(items, options) {
        var _a;
        if (((_a = options.order) === null || _a === void 0 ? void 0 : _a.length) > 0 && options.order[0].by === 'title') {
            const collator = (0, getCollator_1.getCollator)();
            items.sort((a, b) => ((options.order[0].dir === 'ASC') ? 1 : -1) * collator.compare(a.title, b.title));
        }
    }
    static async all(options = null) {
        let output = await super.all(options);
        if (options) {
            this.handleTitleNaturalSorting(output, options);
        }
        if (options && options.includeDeleted === false) {
            output = output.filter(f => !f.deleted_time);
        }
        if (options && options.includeTrash) {
            output.push((0, trash_1.getTrashFolder)());
        }
        if (options && options.includeConflictFolder) {
            const conflictCount = await Note_1.default.conflictedCount();
            if (conflictCount)
                output.unshift(this.conflictFolder());
        }
        return output;
    }
    static async childrenIds(folderId, options = null) {
        options = Object.assign({}, options);
        const where = ['parent_id = ?'];
        if (!options.includeDeleted) {
            where.push('deleted_time = 0');
        }
        const folders = await this.db().selectAll(`SELECT id FROM folders WHERE ${where.join(' AND ')}`, [folderId]);
        let output = [];
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];
            output.push(f.id);
            const subChildrenIds = await this.childrenIds(f.id, options);
            output = output.concat(subChildrenIds);
        }
        return output;
    }
    static async expandTree(folders, parentId) {
        const folderPath = await this.folderPath(folders, parentId);
        folderPath.pop(); // We don't expand the leaft notebook
        for (const folder of folderPath) {
            this.dispatch({
                type: 'FOLDER_SET_COLLAPSED',
                id: folder.id,
                collapsed: false,
            });
        }
    }
    static async allChildrenFolders(folderId) {
        const sql = `
			WITH RECURSIVE
				folders_cte(id, parent_id, share_id) AS (
					SELECT id, parent_id, share_id
						FROM folders
						WHERE parent_id = ?
					UNION ALL
						SELECT folders.id, folders.parent_id, folders.share_id
							FROM folders
							INNER JOIN folders_cte AS folders_cte ON (folders.parent_id = folders_cte.id)
				)
				SELECT id, parent_id, share_id FROM folders_cte;
		`;
        return this.db().selectAll(sql, [folderId]);
    }
    static async rootSharedFolders(activeShares) {
        return this.removeDuplicateRootFolders(await this.db().selectAll('SELECT id, share_id FROM folders WHERE parent_id = \'\' AND share_id != \'\''), activeShares);
    }
    static async rootShareFoldersByKeyId(keyId) {
        return this.db().selectAll('SELECT id, share_id FROM folders WHERE master_key_id = ?', [keyId]);
    }
    // We need this function for this situation:
    //
    // - Folder is shared
    // - Subfolder is created in the shared folder
    // - Subfolder is moved to the root
    //
    // In that situation the subfolder will have "parent_id" = "" and so will be considered a "root
    // shared folder". However it is not - a "root shared folder" is one that has been explicitly
    // shared by the user.
    //
    // So we have this function to check for root folders that have the same "shared_id" - it
    // indicates that one of them was a child of the other. We remove the formerly children folders.
    static removeDuplicateRootFolders(rootFolders, activeShares) {
        const folderIdsToRemove = [];
        for (let i = 0; i < rootFolders.length - 1; i++) {
            const f1 = rootFolders[i];
            for (let j = i + 1; j < rootFolders.length; j++) {
                const f2 = rootFolders[j];
                if (f1.share_id === f2.share_id) {
                    logger.info('Found two root folders with the same share_id:', f1, f2);
                    const share = activeShares.find(s => s.id === f1.share_id);
                    if (!share) {
                        logger.warn('Could not find matching share object');
                        continue;
                    }
                    if (share.folder_id === f1.id) {
                        folderIdsToRemove.push(f2.id);
                    }
                    else if (share.folder_id === f2.id) {
                        folderIdsToRemove.push(f1.id);
                    }
                    else {
                        logger.warn('Could not find folder associated with share:', share);
                    }
                }
            }
        }
        if (folderIdsToRemove.length) {
            logger.info('Removing folders from the list of root folders:', folderIdsToRemove);
            const newRootFolders = [];
            for (const f of rootFolders) {
                if (!folderIdsToRemove.includes(f.id)) {
                    newRootFolders.push(f);
                }
            }
            return newRootFolders;
        }
        return rootFolders;
    }
    static async updateFolderShareIds(activeShares) {
        // Get all the sub-folders of the shared folders, and set the share_id
        // property.
        const rootFolders = await this.rootSharedFolders(activeShares);
        let sharedFolderIds = [];
        const report = {
            shareUpdateCount: 0,
            unshareUpdateCount: 0,
        };
        for (const rootFolder of rootFolders) {
            const children = await this.allChildrenFolders(rootFolder.id);
            report.shareUpdateCount += children.length;
            for (const child of children) {
                if (child.share_id !== rootFolder.share_id) {
                    await this.save({
                        id: child.id,
                        share_id: rootFolder.share_id,
                        updated_time: Date.now(),
                    }, { autoTimestamp: false });
                }
            }
            sharedFolderIds.push(rootFolder.id);
            sharedFolderIds = sharedFolderIds.concat(children.map(c => c.id));
        }
        // Now that we've set the share ID on all the sub-folders of the shared
        // folders, those that remain should not be shared anymore. For example,
        // if they've been moved out of a shared folder.
        // await this.unshareItems(ModelType.Folder, sharedFolderIds);
        const sql = ['SELECT id, parent_id FROM folders WHERE share_id != \'\''];
        if (sharedFolderIds.length) {
            sql.push(` AND id NOT IN (${Folder.escapeIdsForSql(sharedFolderIds)})`);
        }
        const foldersToUnshare = await this.db().selectAll(sql.join(' '));
        report.unshareUpdateCount += foldersToUnshare.length;
        for (const item of foldersToUnshare) {
            await this.save({
                id: item.id,
                share_id: '',
                updated_time: Date.now(),
                parent_id: item.parent_id,
            }, { autoTimestamp: false });
        }
        logger.debug('updateFolderShareIds:', report);
    }
    static async updateNoteShareIds() {
        // Find all the notes where the share_id is not the same as the
        // parent share_id because we only need to update those.
        const rows = await this.db().selectAll(`
			SELECT notes.id, folders.share_id, notes.parent_id
			FROM notes
			LEFT JOIN folders ON notes.parent_id = folders.id
			WHERE notes.share_id != folders.share_id
		`);
        logger.debug('updateNoteShareIds: notes to update:', rows.length);
        for (const row of rows) {
            await Note_1.default.save({
                id: row.id,
                share_id: row.share_id || '',
                parent_id: row.parent_id,
                updated_time: Date.now(),
            }, {
                autoTimestamp: false,
                disableReadOnlyCheck: true,
            });
        }
    }
    static async updateResourceShareIds(resourceService) {
        // Updating the share_id property of the resources is complex because:
        //
        // The resource association to the note is done indirectly via the
        // ResourceService
        //
        // And a given resource can appear inside multiple notes. However, for
        // sharing we make the assumption that a resource can be part of only
        // one share (one-to-one relationship because "share_id" is part of the
        // "resources" table), which is usually the case. By copying and pasting
        // note content from one note to another it's however possible to have
        // the same resource in multiple shares (or in a non-shared and a shared
        // folder).
        //
        // So in this function we take this into account - if a shared resource
        // is part of multiple notes, we duplicate that resource so that each
        // note has its own instance. When such duplication happens, we need to
        // resume the process from the start (thus the loop) so that we deal
        // with the right note/resource associations.
        for (let i = 0; i < 5; i++) {
            // Find all resources where share_id is different from parent note
            // share_id. Then update share_id on all these resources. Essentially it
            // makes it match the resource share_id to the note share_id. At the
            // same time we also process the is_shared property.
            const rows = (await this.db().selectAll(`
				SELECT
					r.id,
					n.share_id,
					n.is_shared,
					r.is_shared as resource_is_shared,
					r.share_id as resource_share_id
				FROM note_resources nr
				LEFT JOIN resources r ON nr.resource_id = r.id
				LEFT JOIN notes n ON nr.note_id = n.id
				WHERE (
					n.share_id != r.share_id
					OR n.is_shared != r.is_shared
				) AND nr.is_associated = 1
			`));
            if (!rows.length)
                return;
            logger.debug('updateResourceShareIds: resources to update:', rows.length);
            const resourceIds = rows.map(r => r.id);
            // Now we check, for each resource, that it is associated with only
            // one note. If it is not, we create duplicate resources so that
            // each note has its own separate resource.
            const noteResourceAssociations = await this.db().selectAll(`
				SELECT resource_id, note_id, notes.share_id
				FROM note_resources
				LEFT JOIN notes ON notes.id = note_resources.note_id
				WHERE resource_id IN (${this.escapeIdsForSql(resourceIds)})
				AND is_associated = 1
			`);
            const resourceIdToNotes = {};
            for (const r of noteResourceAssociations) {
                if (!resourceIdToNotes[r.resource_id])
                    resourceIdToNotes[r.resource_id] = [];
                resourceIdToNotes[r.resource_id].push(r);
            }
            let hasCreatedResources = false;
            for (const [resourceId, rows] of Object.entries(resourceIdToNotes)) {
                if (rows.length <= 1)
                    continue;
                for (let i = 0; i < rows.length - 1; i++) {
                    const row = rows[i];
                    const note = await Note_1.default.load(row.note_id);
                    if (!note)
                        continue; // probably got deleted in the meantime?
                    const newResource = await Resource_1.default.duplicateResource(resourceId);
                    logger.info(`updateResourceShareIds: Automatically created resource "${newResource.id}" to replace resource "${resourceId}" because it is shared and duplicate across notes:`, row);
                    const regex = new RegExp(resourceId, 'gi');
                    const newBody = note.body.replace(regex, newResource.id);
                    await Note_1.default.save({
                        id: note.id,
                        body: newBody,
                        parent_id: note.parent_id,
                        updated_time: Date.now(),
                    }, {
                        autoTimestamp: false,
                    });
                    hasCreatedResources = true;
                }
            }
            // If we have created resources, we refresh the note/resource
            // associations using ResourceService and we resume the process.
            // Normally, if the user didn't create any new notes or resources in
            // the meantime, the second loop should find that each shared
            // resource is associated with only one note.
            if (hasCreatedResources) {
                await resourceService.indexNoteResources();
                continue;
            }
            else {
                // If all is good, we can set the share_id and is_shared
                // property of the resource.
                const now = Date.now();
                for (const row of rows) {
                    const resource = {
                        id: row.id,
                        share_id: row.share_id || '',
                        is_shared: row.is_shared,
                        updated_time: now,
                    };
                    // When a resource becomes published or shared, we set
                    // `blob_updated_time` to ensure that the resource content
                    // is uploaded too during the next sync operation.
                    //
                    // This is necessary because Joplin Server needs to
                    // associate `share_id` or `is_shared` with the resource
                    // content for sharing to work. Otherwise the share
                    // recipient will only get the resource metadata.
                    if (row.is_shared !== row.resource_is_shared || row.share_id !== row.resource_share_id) {
                        resource.blob_updated_time = now;
                    }
                    await Resource_1.default.save(resource, { autoTimestamp: false });
                }
                return;
            }
        }
        throw new Error('Failed to update resource share IDs');
    }
    static async updateAllShareIds(resourceService, activeShares) {
        await this.updateFolderShareIds(activeShares);
        await this.updateNoteShareIds();
        await this.updateResourceShareIds(resourceService);
    }
    // Clear the "share_id" property for the items that are associated with a
    // share that no longer exists.
    static async updateNoLongerSharedItems(activeShareIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const tableNameToClasses = {
            'folders': Folder,
            'notes': Note_1.default,
            'resources': Resource_1.default,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const report = {};
        for (const tableName of ['folders', 'notes', 'resources']) {
            const ItemClass = tableNameToClasses[tableName];
            const hasParentId = tableName !== 'resources';
            const fields = ['id'];
            if (hasParentId)
                fields.push('parent_id');
            const query = activeShareIds.length ? `
				SELECT ${this.db().escapeFields(fields)} FROM ${tableName}
				WHERE share_id != '' AND share_id NOT IN (${this.escapeIdsForSql(activeShareIds)})
			` : `
				SELECT ${this.db().escapeFields(fields)} FROM ${tableName}
				WHERE share_id != ''
			`;
            const rows = await this.db().selectAll(query);
            report[tableName] = rows.length;
            for (const row of rows) {
                const toSave = {
                    id: row.id,
                    share_id: '',
                    // Don't change the updated_time.
                    // This prevents conflicts in the case where the item was unshared remotely.
                    // See https://github.com/laurent22/joplin/issues/12648
                    // updated_time: Date.now(),
                };
                if (hasParentId) {
                    toSave.parent_id = row.parent_id;
                }
                await ItemClass.save(toSave, { autoTimestamp: false });
            }
        }
        logger.debug('updateNoLongerSharedItems:', report);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async allAsTree(folders = null, options = null) {
        const all = folders ? folders : await this.all(options);
        if (options && options.includeNotes) {
            for (const folder of all) {
                folder.notes = await Note_1.default.previews(folder.id);
            }
        }
        // https://stackoverflow.com/a/49387427/561309
        function getNestedChildren(models, parentId) {
            const nestedTreeStructure = [];
            const length = models.length;
            for (let i = 0; i < length; i++) {
                const model = models[i];
                if (model.parent_id === parentId) {
                    const children = getNestedChildren(models, model.id);
                    if (children.length > 0) {
                        model.children = children;
                    }
                    nestedTreeStructure.push(model);
                }
            }
            return nestedTreeStructure;
        }
        return getNestedChildren(all, '');
    }
    static folderPath(folders, folderId) {
        const idToFolders = {};
        for (let i = 0; i < folders.length; i++) {
            idToFolders[folders[i].id] = folders[i];
        }
        const path = [];
        while (folderId) {
            const folder = idToFolders[folderId];
            if (!folder)
                break; // Shouldn't happen
            path.push(folder);
            folderId = folder.parent_id;
        }
        path.reverse();
        return path;
    }
    static folderPathString(folders, folderId, maxTotalLength = 80) {
        const path = this.folderPath(folders, folderId);
        let currentTotalLength = 0;
        for (let i = 0; i < path.length; i++) {
            currentTotalLength += path[i].title.length;
        }
        let pieceLength = maxTotalLength;
        if (currentTotalLength > maxTotalLength) {
            pieceLength = maxTotalLength / path.length;
        }
        const output = [];
        for (let i = 0; i < path.length; i++) {
            output.push(substrWithEllipsis(path[i].title, 0, pieceLength));
        }
        return output.join(' / ');
    }
    static buildTree(folders) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const idToFolders = {};
        for (let i = 0; i < folders.length; i++) {
            idToFolders[folders[i].id] = Object.assign({}, folders[i]);
            idToFolders[folders[i].id].children = [];
        }
        const rootFolders = [];
        for (const folderId in idToFolders) {
            if (!idToFolders.hasOwnProperty(folderId))
                continue;
            const folder = idToFolders[folderId];
            if (!folder.parent_id) {
                rootFolders.push(folder);
            }
            else {
                if (!idToFolders[folder.parent_id]) {
                    // It means the notebook is referring a folder that doesn't exist. In theory it shouldn't happen
                    // but sometimes does - https://github.com/laurent22/joplin/issues/1068#issuecomment-450594708
                    rootFolders.push(folder);
                }
                else {
                    idToFolders[folder.parent_id].children.push(folder);
                }
            }
        }
        return rootFolders;
    }
    static async sortFolderTree(folders = null) {
        const output = folders ? folders : await this.allAsTree();
        const sortFoldersAlphabetically = (folders) => {
            const collator = (0, getCollator_1.getCollator)();
            folders.sort((a, b) => {
                if (a.parent_id === b.parent_id) {
                    return collator.compare(a.title, b.title);
                }
                return 0;
            });
            return folders;
        };
        const sortFolders = (folders) => {
            for (let i = 0; i < folders.length; i++) {
                const folder = folders[i];
                if (folder.children) {
                    folder.children = sortFoldersAlphabetically(folder.children);
                    sortFolders(folder.children);
                }
            }
            return folders;
        };
        sortFolders(sortFoldersAlphabetically(output));
        return output;
    }
    static async loadByTitleAndParent(title, parentId, options = null) {
        return await this.modelSelectOne(`SELECT ${this.selectFields(options)} FROM folders WHERE title = ? and parent_id = ?`, [title, parentId]);
    }
    static load(id, options = null) {
        if (id === this.conflictFolderId())
            return Promise.resolve(this.conflictFolder());
        if (id === (0, getTrashFolderId_1.default)())
            return Promise.resolve((0, trash_1.getTrashFolder)());
        return super.load(id, options);
    }
    static defaultFolder() {
        return this.modelSelectOne('SELECT * FROM folders ORDER BY created_time DESC LIMIT 1');
    }
    static async canNestUnder(folderId, targetFolderId) {
        if (folderId === targetFolderId)
            return false;
        const folder = await Folder.load(folderId);
        if ((0, reducer_1.isRootSharedFolder)(folder))
            return false;
        const conflictFolderId = Folder.conflictFolderId();
        if (folderId === conflictFolderId || targetFolderId === conflictFolderId)
            return false;
        if (!targetFolderId)
            return true;
        while (true) {
            const folder = await Folder.load(targetFolderId);
            if (!folder.parent_id)
                break;
            if (folder.parent_id === folderId)
                return false;
            targetFolderId = folder.parent_id;
        }
        return true;
    }
    static async moveToFolder(folderId, targetFolderId) {
        if (!(await this.canNestUnder(folderId, targetFolderId)))
            throw new Error((0, locale_1._)('Cannot move notebook to this location'));
        const original = await this.load(folderId);
        const modifiedFolder = {
            id: folderId,
            parent_id: targetFolderId,
            // When moving a note to a different folder, the user timestamp is not updated.
            // However updated_time is updated so that the note can be synced later on.
            updated_time: time_1.default.unixMs(),
            share_id: original.share_id,
        };
        const wasShared = !!modifiedFolder.share_id;
        const movedToTopLevel = original.parent_id !== '' && targetFolderId === '';
        if (wasShared && movedToTopLevel) {
            // When a shared subfolder is converted to a toplevel folder, clear its share_id
            // as soon as possible. Without this, modifiedFolder would be incorrectly treated
            // as a root shared folder by some logic.
            // Since the folder's children aren't toplevel, they won't be considered root
            // shared folders and are updated later.
            modifiedFolder.share_id = '';
        }
        return Folder.save(modifiedFolder, { autoTimestamp: false });
    }
    // These "duplicateCheck" and "reservedTitleCheck" should only be done when a user is
    // manually creating a folder. They shouldn't be done for example when the folders
    // are being synced to avoid any strange side-effects. Technically it's possible to
    // have folders and notes with duplicate titles (or no title), or with reserved words.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async save(o, options = null) {
        if (!options)
            options = {};
        if (options.userSideValidation === true) {
            if (!('duplicateCheck' in options))
                options.duplicateCheck = true;
            if (!('reservedTitleCheck' in options))
                options.reservedTitleCheck = true;
            if (!('stripLeftSlashes' in options))
                options.stripLeftSlashes = true;
            if (o.id && o.parent_id && o.id === o.parent_id) {
                throw new Error('Parent ID cannot be the same as ID');
            }
        }
        if (options.stripLeftSlashes === true && o.title) {
            while (o.title.length && (o.title[0] === '/' || o.title[0] === '\\')) {
                o.title = o.title.substr(1);
            }
        }
        // We allow folders with duplicate titles so that folders with the same title can exist under different parent folder. For example:
        //
        // PHP
        //     Code samples
        //     Doc
        // Java
        //     My project
        //     Doc
        // if (options.duplicateCheck === true && o.title) {
        // 	let existingFolder = await Folder.loadByTitle(o.title);
        // 	if (existingFolder && existingFolder.id != o.id) throw new Error(_('A notebook with this title already exists: "%s"', o.title));
        // }
        if (options.reservedTitleCheck === true && o.title) {
            if (o.title === Folder.conflictFolderTitle())
                throw new Error((0, locale_1._)('Notebooks cannot be named "%s", which is a reserved title.', o.title));
        }
        syncDebugLog_1.default.info('Folder Save:', o);
        let savedFolder = await super.save(o, options);
        // Ensures that any folder added to the state has all the required
        // properties, in particular "share_id" and "parent_id', which are
        // required in various parts of the code.
        if (!('share_id' in savedFolder) || !('parent_id' in savedFolder) || !('deleted_time' in savedFolder)) {
            savedFolder = await this.load(savedFolder.id);
        }
        this.dispatch({
            type: 'FOLDER_UPDATE_ONE',
            item: savedFolder,
        });
        return savedFolder;
    }
    static async trashItemsOlderThan(ttl) {
        const cutOffTime = Date.now() - ttl;
        const getItemIds = async (table, cutOffTime) => {
            const items = await this.db().selectAll(`SELECT id from ${table} WHERE deleted_time > 0 AND deleted_time < ?`, [cutOffTime]);
            return items.map(i => i.id);
        };
        return {
            noteIds: await getItemIds('notes', cutOffTime),
            folderIds: await getItemIds('folders', cutOffTime),
        };
    }
    static serializeIcon(icon) {
        return icon ? JSON.stringify(icon) : '';
    }
    static unserializeIcon(icon) {
        if (!icon)
            return null;
        return Object.assign(Object.assign({}, (0, types_1.defaultFolderIcon)()), JSON.parse(icon));
    }
    static shouldShowFolderIcons(folders) {
        // If at least one of the folder has an icon, then we display icons for all
        // folders (those without one will get the default icon). This is so that
        // visual alignment is correct for all folders, otherwise the folder tree
        // looks messy.
        return !!folders.find(f => !!f.icon);
    }
    static getRealFolders(folders) {
        // returns all folders other than trash folder and deleted folders
        const trashFolderId = (0, getTrashFolderId_1.default)();
        return folders.filter((folder) => folder.id !== trashFolderId && folder.deleted_time === 0);
    }
    static atLeastOneRealFolderExists(folders) {
        // returns true if at least one folder exists other than trash folder and deleted folders
        return this.getRealFolders(folders).length > 0;
    }
}
exports.default = Folder;
