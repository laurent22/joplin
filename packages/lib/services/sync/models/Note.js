"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const BaseItem_1 = require("./BaseItem");
const ItemChange_1 = require("./ItemChange");
const Setting_1 = require("./Setting");
const shim_1 = require("../shim");
const time_1 = require("../time");
const markdownUtils_1 = require("../markdownUtils");
const Tag_1 = require("./Tag");
const { sprintf } = require('sprintf-js');
const syncDebugLog_1 = require("../services/synchronizer/syncDebugLog");
const path_utils_1 = require("../path-utils");
const { pregQuote, substrWithEllipsis } = require('../string-utils.js');
const { _, _n } = require('../locale');
const ArrayUtils_1 = require("../ArrayUtils");
const ActionLogger_1 = require("../utils/ActionLogger");
const trash_1 = require("../services/trash");
const getCollator_1 = require("./utils/getCollator");
const urlUtils = require('../urlUtils.js');
const { isImageMimeType } = require('../resourceUtils');
const { MarkupToHtml } = require('@joplin/renderer');
const { ALL_NOTES_FILTER_ID } = require('../reserved-ids');
class Note extends BaseItem_1.default {
    static tableName() {
        return 'notes';
    }
    static fieldToLabel(field) {
        const fieldsToLabels = {
            title: _('title'),
            user_updated_time: _('updated date'),
            user_created_time: _('created date'),
            order: _('custom order'),
            todo_due: _('due date'),
            todo_completed: _('completion date'),
        };
        return field in fieldsToLabels ? fieldsToLabels[field] : field;
    }
    static async serializeForEdit(note) {
        return this.replaceResourceInternalToExternalLinks(await super.serialize(note, ['title', 'body']));
    }
    static async unserializeForEdit(content) {
        content += `\n\ntype_: ${BaseModel_1.default.TYPE_NOTE}`;
        const output = await super.unserialize(content);
        if (!output.title)
            output.title = '';
        if (!output.body)
            output.body = '';
        output.body = await this.replaceResourceExternalToInternalLinks(output.body);
        return output;
    }
    static async serializeAllProps(note) {
        const fieldNames = this.fieldNames();
        fieldNames.push('type_');
        (0, ArrayUtils_1.pull)(fieldNames, 'title', 'body');
        return super.serialize(note, fieldNames);
    }
    static minimalSerializeForDisplay(note) {
        const n = Object.assign({}, note);
        const fieldNames = this.fieldNames();
        if (!n.is_conflict)
            (0, ArrayUtils_1.pull)(fieldNames, 'is_conflict');
        if (!Number(n.latitude))
            (0, ArrayUtils_1.pull)(fieldNames, 'latitude');
        if (!Number(n.longitude))
            (0, ArrayUtils_1.pull)(fieldNames, 'longitude');
        if (!Number(n.altitude))
            (0, ArrayUtils_1.pull)(fieldNames, 'altitude');
        if (!n.author)
            (0, ArrayUtils_1.pull)(fieldNames, 'author');
        if (!n.source_url)
            (0, ArrayUtils_1.pull)(fieldNames, 'source_url');
        if (!n.is_todo) {
            (0, ArrayUtils_1.pull)(fieldNames, 'is_todo');
            (0, ArrayUtils_1.pull)(fieldNames, 'todo_due');
            (0, ArrayUtils_1.pull)(fieldNames, 'todo_completed');
        }
        if (!n.application_data)
            (0, ArrayUtils_1.pull)(fieldNames, 'application_data');
        (0, ArrayUtils_1.pull)(fieldNames, 'type_');
        (0, ArrayUtils_1.pull)(fieldNames, 'title');
        (0, ArrayUtils_1.pull)(fieldNames, 'body');
        (0, ArrayUtils_1.pull)(fieldNames, 'created_time');
        (0, ArrayUtils_1.pull)(fieldNames, 'updated_time');
        (0, ArrayUtils_1.pull)(fieldNames, 'order');
        return super.serialize(n, fieldNames);
    }
    static defaultTitle(noteBody) {
        return this.defaultTitleFromBody(noteBody);
    }
    static defaultTitleFromBody(body) {
        return markdownUtils_1.default.titleFromBody(body);
    }
    static geolocationUrl(note) {
        if (!('latitude' in note) || !('longitude' in note))
            throw new Error('Latitude or longitude is missing');
        if (!Number(note.latitude) && !Number(note.longitude))
            throw new Error(_('This note does not have geolocation information.'));
        return this.geoLocationUrlFromLatLong(note.latitude, note.longitude);
    }
    static geoLocationUrlFromLatLong(lat, long) {
        return sprintf('https://www.openstreetmap.org/?lat=%s&lon=%s&zoom=20', lat, long);
    }
    static modelType() {
        return BaseModel_1.default.TYPE_NOTE;
    }
    static linkedItemIds(body) {
        if (!body || body.length <= 32)
            return [];
        const links = urlUtils.extractResourceUrls(body);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const itemIds = links.map((l) => l.itemId);
        return (0, ArrayUtils_1.unique)(itemIds);
    }
    static async linkedItems(body) {
        const itemIds = this.linkedItemIds(body);
        const r = await BaseItem_1.default.loadItemsByIds(itemIds);
        return r;
    }
    static async linkedItemIdsByType(type, body) {
        const items = await this.linkedItems(body);
        const output = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type_ === type)
                output.push(item.id);
        }
        return output;
    }
    static async linkedResourceIds(body) {
        return this.linkedItemIdsByType(BaseModel_1.default.TYPE_RESOURCE, body);
    }
    static async linkedNoteIds(body) {
        return this.linkedItemIdsByType(BaseModel_1.default.TYPE_NOTE, body);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async replaceResourceInternalToExternalLinks(body, options = null) {
        options = Object.assign({ useAbsolutePaths: false }, options);
        // this.logger().debug('replaceResourceInternalToExternalLinks', 'options:', options, 'body:', body);
        const resourceIds = await this.linkedResourceIds(body);
        const Resource = this.getClass('Resource');
        for (let i = 0; i < resourceIds.length; i++) {
            const id = resourceIds[i];
            const resource = await Resource.load(id);
            if (!resource)
                continue;
            const isImage = isImageMimeType(resource.mime);
            // We add a timestamp parameter for images, so that when they
            // change, the preview is updated inside the note. This is not
            // needed for other resources since they are simple links.
            const timestampParam = isImage ? `?t=${resource.updated_time}` : '';
            const resourcePath = options.useAbsolutePaths ? (0, path_utils_1.toFileProtocolPath)(Resource.fullPath(resource)) + timestampParam : Resource.relativePath(resource);
            body = body.replace(new RegExp(`:/${id}`, 'gi'), markdownUtils_1.default.escapeLinkUrl(resourcePath));
        }
        // this.logger().debug('replaceResourceInternalToExternalLinks result', body);
        return body;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async replaceResourceExternalToInternalLinks(body, options = null) {
        options = Object.assign({ useAbsolutePaths: false }, options);
        const resourceDir = (0, path_utils_1.toForwardSlashes)(Setting_1.default.value('resourceDir'));
        const pathsToTry = [];
        if (options.useAbsolutePaths) {
            pathsToTry.push(`file://${resourceDir}`);
            pathsToTry.push(`file:///${resourceDir}`);
            pathsToTry.push(`file://${shim_1.default.pathRelativeToCwd(resourceDir)}`);
            pathsToTry.push(`file:///${shim_1.default.pathRelativeToCwd(resourceDir)}`);
        }
        else {
            const Resource = this.getClass('Resource');
            pathsToTry.push(Resource.baseRelativeDirectoryPath());
        }
        body = Note.replaceResourceExternalToInternalLinks_(pathsToTry, body);
        return body;
    }
    static replaceResourceExternalToInternalLinks_(pathsToTry, body) {
        // This is a moved to a separate function for the purpose of testing only
        // We support both the escaped and unescaped versions because both
        // of those paths are valid:
        //
        // [](file://C:/I like spaces in paths/abcdefg.jpg)
        // [](file://C:/I%20like%20spaces%20in%20paths/abcdefg.jpg)
        //
        // https://discourse.joplinapp.org/t/12986/4
        const temp = [];
        for (const p of pathsToTry) {
            temp.push(p);
            temp.push(encodeURI(p));
        }
        pathsToTry = temp;
        // this.logger().debug('replaceResourceExternalToInternalLinks', 'options:', options, 'pathsToTry:', pathsToTry);
        const Resource = this.getClass('Resource');
        for (const basePath of pathsToTry) {
            const reStrings = [
                // Handles file://path/to/abcdefg.jpg?t=12345678
                `${pregQuote(`${basePath}/`)}[a-zA-Z0-9]{32}\\.[a-zA-Z0-9]+\\?t=[0-9]+`,
                // Handles file://path/to/abcdefg.jpg
                `${pregQuote(`${basePath}/`)}[a-zA-Z0-9]{32}\\.[a-zA-Z0-9]+`,
            ];
            for (const reString of reStrings) {
                const re = new RegExp(reString, 'gi');
                body = body.replace(re, match => {
                    const id = Resource.pathToId(match);
                    return `:/${id}`;
                });
            }
            // Handles joplin://af0edffa4a60496bba1b0ba06b8fb39a
            body = body.replace(/\(joplin:\/\/([a-zA-Z0-9]{32})\)/g, '(:/$1)');
        }
        // this.logger().debug('replaceResourceExternalToInternalLinks result', body);
        return body;
    }
    static new(parentId = '') {
        const output = super.new();
        output.parent_id = parentId;
        return output;
    }
    static newTodo(parentId = '') {
        const output = this.new(parentId);
        output.is_todo = true;
        return output;
    }
    // Note: sort logic must be duplicated in previews().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static sortNotes(notes, orders, uncompletedTodosOnTop) {
        const noteOnTop = (note) => {
            return uncompletedTodosOnTop && note.is_todo && !note.todo_completed;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const noteFieldComp = (f1, f2) => {
            if (f1 === f2)
                return 0;
            return f1 < f2 ? -1 : +1;
        };
        // Makes the sort deterministic, so that if, for example, a and b have the
        // same updated_time, they aren't swapped every time a list is refreshed.
        const sortIdenticalNotes = (a, b) => {
            let r = null;
            r = noteFieldComp(a.user_updated_time, b.user_updated_time);
            if (r)
                return r;
            r = noteFieldComp(a.user_created_time, b.user_created_time);
            if (r)
                return r;
            const titleA = a.title ? a.title.toLowerCase() : '';
            const titleB = b.title ? b.title.toLowerCase() : '';
            r = noteFieldComp(titleA, titleB);
            if (r)
                return r;
            return noteFieldComp(a.id, b.id);
        };
        const collator = (0, getCollator_1.getCollator)();
        return notes.sort((a, b) => {
            if (noteOnTop(a) && !noteOnTop(b))
                return -1;
            if (!noteOnTop(a) && noteOnTop(b))
                return +1;
            let r = 0;
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                let aProp = a[order.by];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                let bProp = b[order.by];
                if (typeof aProp === 'string')
                    aProp = aProp.toLowerCase();
                if (typeof bProp === 'string')
                    bProp = bProp.toLowerCase();
                if (order.by === 'title') {
                    r = -1 * collator.compare(aProp, bProp);
                }
                else {
                    if (aProp < bProp)
                        r = +1;
                    if (aProp > bProp)
                        r = -1;
                }
                if (order.dir === 'ASC')
                    r = -r;
                if (r !== 0)
                    return r;
            }
            return sortIdenticalNotes(a, b);
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static previewFieldsWithDefaultValues(options = null) {
        return Note.defaultValues(this.previewFields(options));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static previewFields(options = null) {
        options = Object.assign({ includeTimestamps: true }, options);
        const output = ['id', 'title', 'is_todo', 'todo_completed', 'todo_due', 'parent_id', 'encryption_applied', 'order', 'markup_language', 'is_conflict', 'is_shared', 'share_id', 'deleted_time'];
        if (options.includeTimestamps) {
            output.push('updated_time');
            output.push('user_updated_time');
            output.push('user_created_time');
        }
        return output;
    }
    static previewFieldsSql(fields = null) {
        if (fields === null)
            fields = this.previewFields();
        const escaped = this.db().escapeFields(fields);
        return Array.isArray(escaped) ? escaped.join(',') : escaped;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async loadFolderNoteByField(folderId, field, value) {
        if (!folderId)
            throw new Error('folderId is undefined');
        const options = {
            conditions: [`\`${field}\` = ?`],
            conditionsParams: [value],
            fields: '*',
        };
        const results = await this.previews(folderId, options);
        return results.length ? results[0] : null;
    }
    static async previews(parentId, options = null) {
        // Note: ordering logic must be duplicated in sortNotes(), which is used
        // to sort already loaded notes.
        if (!options)
            options = {};
        if (!('order' in options))
            options.order = [{ by: 'user_updated_time', dir: 'DESC' }, { by: 'user_created_time', dir: 'DESC' }, { by: 'title', dir: 'DESC' }, { by: 'id', dir: 'DESC' }];
        if (!options.conditions)
            options.conditions = [];
        if (!options.conditionsParams)
            options.conditionsParams = [];
        if (!options.fields)
            options.fields = this.previewFields();
        if (!options.uncompletedTodosOnTop)
            options.uncompletedTodosOnTop = false;
        if (!('showCompletedTodos' in options))
            options.showCompletedTodos = true;
        const autoAddedFields = [];
        if (Array.isArray(options.fields)) {
            options.fields = options.fields.slice();
            // These fields are required for the rest of the function to work
            if (!options.fields.includes('deleted_time')) {
                autoAddedFields.push('deleted_time');
                options.fields.push('deleted_time');
            }
            if (!options.fields.includes('parent_id')) {
                autoAddedFields.push('parent_id');
                options.fields.push('parent_id');
            }
            if (!options.fields.includes('id')) {
                autoAddedFields.push('id');
                options.fields.push('id');
            }
        }
        const Folder = BaseItem_1.default.getClass('Folder');
        const parentFolder = await Folder.load(parentId, { fields: ['id', 'deleted_time'] });
        const parentInTrash = parentFolder ? !!parentFolder.deleted_time : false;
        const withinTrash = parentId === (0, trash_1.getTrashFolderId)() || parentInTrash;
        // Conflicts are always displayed regardless of options, since otherwise
        // it's confusing to have conflicts but with an empty conflict folder.
        // For a similar reason we want to show all notes that have been deleted
        // in the trash.
        if (parentId === Folder.conflictFolderId() || withinTrash)
            options.showCompletedTodos = true;
        if (parentId === Folder.conflictFolderId()) {
            options.conditions.push('is_conflict = 1');
            options.conditions.push('deleted_time = 0');
        }
        else if (withinTrash) {
            options.conditions.push('deleted_time > 0');
        }
        else {
            options.conditions.push('is_conflict = 0');
            options.conditions.push('deleted_time = 0');
            if (parentId && parentId !== ALL_NOTES_FILTER_ID) {
                options.conditions.push('parent_id = ?');
                options.conditionsParams.push(parentId);
            }
        }
        if (options.anywherePattern) {
            const pattern = options.anywherePattern.replace(/\*/g, '%');
            options.conditions.push('(title LIKE ? OR body LIKE ?)');
            options.conditionsParams.push(pattern);
            options.conditionsParams.push(pattern);
        }
        let hasNotes = true;
        let hasTodos = true;
        if (options.itemTypes && options.itemTypes.length) {
            if (options.itemTypes.indexOf('note') < 0) {
                hasNotes = false;
            }
            else if (options.itemTypes.indexOf('todo') < 0) {
                hasTodos = false;
            }
        }
        if (!options.showCompletedTodos) {
            options.conditions.push('todo_completed <= 0');
        }
        if (!withinTrash && options.uncompletedTodosOnTop && hasTodos) {
            let cond = options.conditions.slice();
            cond.push('is_todo = 1');
            cond.push('(todo_completed <= 0 OR todo_completed IS NULL)');
            let tempOptions = Object.assign({}, options);
            tempOptions.conditions = cond;
            const uncompletedTodos = await this.search(tempOptions);
            this.handleTitleNaturalSorting(uncompletedTodos, tempOptions);
            cond = options.conditions.slice();
            if (hasNotes && hasTodos) {
                cond.push('(is_todo = 0 OR (is_todo = 1 AND todo_completed > 0))');
            }
            else {
                cond.push('(is_todo = 1 AND todo_completed > 0)');
            }
            tempOptions = Object.assign({}, options);
            tempOptions.conditions = cond;
            if ('limit' in tempOptions)
                tempOptions.limit -= uncompletedTodos.length;
            const theRest = await this.search(tempOptions);
            this.handleTitleNaturalSorting(theRest, tempOptions);
            return uncompletedTodos.concat(theRest);
        }
        if (hasNotes && hasTodos) {
            // Nothing
        }
        else if (hasNotes) {
            options.conditions.push('is_todo = 0');
        }
        else if (hasTodos) {
            options.conditions.push('is_todo = 1');
        }
        let results = await this.search(options);
        this.handleTitleNaturalSorting(results, options);
        if (withinTrash) {
            const folderIds = results.map(n => n.parent_id).filter(id => !!id);
            const allFolders = await Folder.byIds(folderIds, { fields: ['id', 'parent_id', 'deleted_time', 'title'] });
            // In the results, we only include notes that were originally at the
            // root (no parent), or that are inside a folder that has also been
            // deleted.
            results = results.filter(note => {
                const noteFolder = allFolders.find(f => f.id === note.parent_id);
                return (0, trash_1.getDisplayParentId)(note, noteFolder) === parentId;
            });
        }
        if (autoAddedFields.length) {
            results = results.map(n => {
                n = Object.assign({}, n);
                for (const field of autoAddedFields) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                    delete n[field];
                }
                return n;
            });
        }
        return results;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static preview(noteId, options = null) {
        if (!options)
            options = { fields: null };
        const excludeConflictsSql = options.excludeConflicts ? 'is_conflict = 0 AND' : '';
        return this.modelSelectOne(`SELECT ${this.previewFieldsSql(options.fields)} FROM notes WHERE ${excludeConflictsSql} id = ?`, [noteId]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async search(options = null) {
        if (!options)
            options = {};
        if (!options.conditions)
            options.conditions = [];
        if (!options.conditionsParams)
            options.conditionsParams = [];
        if (options.bodyPattern) {
            const pattern = options.bodyPattern.replace(/\*/g, '%');
            options.conditions.push('body LIKE ?');
            options.conditionsParams.push(pattern);
        }
        return super.search(options);
    }
    static conflictedNotes() {
        return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 1 AND deleted_time = 0');
    }
    static async conflictedCount() {
        const r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 1 AND deleted_time = 0');
        return r && r.total ? r.total : 0;
    }
    static unconflictedNotes() {
        return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
    }
    static async updateGeolocation(noteId) {
        if (!Setting_1.default.value('trackLocation'))
            return null;
        if (!Note.updateGeolocationEnabled_)
            return null;
        const startWait = time_1.default.unixMs();
        while (true) {
            if (!this.geolocationUpdating_)
                break;
            this.logger().info('Waiting for geolocation update...');
            await time_1.default.sleep(1);
            if (startWait + 1000 * 20 < time_1.default.unixMs()) {
                this.logger().warn(`Failed to update geolocation for: timeout: ${noteId}`);
                return null;
            }
        }
        let geoData = null;
        if (this.geolocationCache_ && this.geolocationCache_.timestamp + 1000 * 60 * 10 > time_1.default.unixMs()) {
            geoData = Object.assign({}, this.geolocationCache_);
        }
        else {
            this.geolocationUpdating_ = true;
            this.logger().info('Fetching geolocation...');
            try {
                geoData = await shim_1.default.Geolocation.currentPosition();
            }
            catch (error) {
                this.logger().error(`Could not get lat/long for note ${noteId}: `, error);
                geoData = null;
            }
            this.geolocationUpdating_ = false;
            if (!geoData)
                return null;
            this.logger().info('Got lat/long');
            this.geolocationCache_ = geoData;
        }
        this.logger().info(`Updating lat/long of note ${noteId}`);
        const note = await Note.load(noteId);
        if (!note)
            return null; // Race condition - note has been deleted in the meantime
        note.longitude = geoData.coords.longitude;
        note.latitude = geoData.coords.latitude;
        note.altitude = geoData.coords.altitude;
        await Note.save(note, { ignoreProvisionalFlag: true });
        return note;
    }
    static filter(note) {
        if (!note)
            return note;
        const output = super.filter(note);
        if ('longitude' in output)
            output.longitude = Number(!output.longitude ? 0 : output.longitude).toFixed(8);
        if ('latitude' in output)
            output.latitude = Number(!output.latitude ? 0 : output.latitude).toFixed(8);
        if ('altitude' in output)
            output.altitude = Number(!output.altitude ? 0 : output.altitude).toFixed(4);
        return output;
    }
    static async copyToFolder(noteId, folderId) {
        const Folder = this.getClass('Folder');
        if (folderId === Folder.conflictFolderId())
            throw new Error(_('Cannot copy note to "%s" notebook', Folder.conflictFolderTitle()));
        return Note.duplicate(noteId, {
            changes: {
                parent_id: folderId,
                is_conflict: 0, // Also reset the conflict flag in case we're moving the note out of the conflict folder
                conflict_original_id: '', // Reset parent id as well.
            },
        });
    }
    static async moveToFolder(noteId, folderId, saveOptions = null) {
        const Folder = this.getClass('Folder');
        if (folderId === Folder.conflictFolderId())
            throw new Error(_('Cannot move note to "%s" notebook', Folder.conflictFolderTitle()));
        // When moving a note to a different folder, the user timestamp is not
        // updated. However updated_time is updated so that the note can be
        // synced later on.
        //
        // We also reset deleted_time, so that if a deleted note is moved to
        // that folder it is restored. If it wasn't deleted, it does nothing.
        const modifiedNote = {
            id: noteId,
            parent_id: folderId,
            is_conflict: 0,
            conflict_original_id: '',
            deleted_time: 0,
            updated_time: time_1.default.unixMs(),
        };
        return Note.save(modifiedNote, Object.assign({ autoTimestamp: false }, saveOptions));
    }
    static changeNoteType(note, type) {
        if (!('is_todo' in note))
            throw new Error('Missing "is_todo" property');
        const newIsTodo = type === 'todo' ? 1 : 0;
        if (Number(note.is_todo) === newIsTodo)
            return note;
        const output = Object.assign({}, note);
        output.is_todo = newIsTodo;
        output.todo_due = 0;
        output.todo_completed = 0;
        return output;
    }
    static toggleIsTodo(note) {
        return this.changeNoteType(note, note.is_todo ? 'note' : 'todo');
    }
    static toggleTodoCompleted(note) {
        if (!('todo_completed' in note))
            throw new Error('Missing "todo_completed" property');
        note = Object.assign({}, note);
        if (note.todo_completed) {
            note.todo_completed = 0;
        }
        else {
            note.todo_completed = Date.now();
        }
        return note;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async duplicateMultipleNotes(noteIds, options = null) {
        // if options.uniqueTitle is true, a unique title for the duplicated file will be assigned.
        const ensureUniqueTitle = options && options.ensureUniqueTitle;
        for (const noteId of noteIds) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const noteOptions = {};
            // If ensureUniqueTitle is truthy, set the original note's name as root for the unique title.
            if (ensureUniqueTitle) {
                const originalNote = await Note.load(noteId);
                noteOptions.uniqueTitle = originalNote.title;
            }
            await Note.duplicate(noteId, noteOptions);
        }
    }
    static async duplicateNoteResources(noteBody) {
        const resourceIds = await this.linkedResourceIds(noteBody);
        let newBody = noteBody;
        const Resource = this.getClass('Resource');
        for (const resourceId of resourceIds) {
            const newResource = await Resource.duplicateResource(resourceId);
            const regex = new RegExp(resourceId, 'gi');
            newBody = newBody.replace(regex, newResource.id);
        }
        return newBody;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async duplicate(noteId, options = null) {
        const changes = options && options.changes;
        const uniqueTitle = options && options.uniqueTitle;
        const duplicateResources = options && !!options.duplicateResources;
        const originalNote = await Note.load(noteId);
        if (!originalNote)
            throw new Error(`Unknown note: ${noteId}`);
        const newNote = Object.assign({}, originalNote);
        const fieldsToReset = [
            'id',
            'created_time',
            'updated_time',
            'user_created_time',
            'user_updated_time',
            'is_shared',
        ];
        for (const field of fieldsToReset) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            delete newNote[field];
        }
        for (const n in changes) {
            if (!changes.hasOwnProperty(n))
                continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            newNote[n] = changes[n];
        }
        if (uniqueTitle) {
            const title = await Note.findUniqueItemTitle(uniqueTitle);
            newNote.title = title;
        }
        if (duplicateResources)
            newNote.body = await this.duplicateNoteResources(newNote.body);
        const newNoteSaved = await this.save(newNote);
        const originalTags = await Tag_1.default.tagsByNoteId(noteId);
        for (const tagToAdd of originalTags) {
            await Tag_1.default.addNote(tagToAdd.id, newNoteSaved.id);
        }
        return this.save(newNoteSaved);
    }
    static async noteIsOlderThan(noteId, date) {
        const n = await this.db().selectOne('SELECT updated_time FROM notes WHERE id = ?', [noteId]);
        if (!n)
            throw new Error(`No such note: ${noteId}`);
        return n.updated_time < date;
    }
    static load(id, options = null) {
        return super.load(id, options);
    }
    static async save(o, options = null) {
        const isNew = this.isNew(o, options);
        // If true, this is a provisional note - it will be saved permanently
        // only if the user makes changes to it.
        const isProvisional = options && !!options.provisional;
        // If true, saving the note will not change the provisional flag of the
        // note. This is used for background processing that it not initiated by
        // the user. For example when setting the geolocation of a note.
        const ignoreProvisionalFlag = options && !!options.ignoreProvisionalFlag;
        const dispatchUpdateAction = options ? options.dispatchUpdateAction !== false : true;
        if (isNew && !o.source)
            o.source = Setting_1.default.value('appName');
        if (isNew && !o.source_application)
            o.source_application = Setting_1.default.value('appId');
        if (isNew && !('order' in o))
            o.order = Date.now();
        if (isNew && !('deleted_time' in o))
            o.deleted_time = 0;
        const changeSource = options && options.changeSource ? options.changeSource : null;
        // We only keep the previous note content for "old notes" (see Revision Service for more info)
        // In theory, we could simply save all the previous note contents, and let the revision service
        // decide what to keep and what to ignore, but in practice keeping the previous content is a bit
        // heavy - the note needs to be reloaded here, the JSON blob needs to be saved, etc.
        // So the check for old note here is basically an optimisation.
        // 2020-10-19: It's not ideal to reload the previous version of the note before saving it again
        // but it should be relatively fast anyway. This is so that code that listens to the NOTE_UPDATE_ONE
        // action can decide what to do based on the fields that have been modified.
        // This is necessary for example so that the folder list is not refreshed every time a note is changed.
        // Now it can look at the properties and refresh only if the "parent_id" property is changed.
        // Trying to fix: https://github.com/laurent22/joplin/issues/3893
        // 2025-09-22: Because we previously only stored the latest previous note contents, this meant that
        // the original note contents would be overwritten if save is called multiple times on a note, between
        // revision collections. In order to retain the original note contents at the point of the last revision
        // collection (which may not have created a revision due to the intervalBetweenRevisions restriction), we
        // now cache note ids for notes which were changed since the last collection, in order to determine whether
        // we should set beforeNoteJson to the current contents in the database, or the last value which was stored
        // in the item_changes table
        const oldNote = !isNew && o.id ? await Note.load(o.id) : null;
        syncDebugLog_1.default.info('Save Note: P:', oldNote);
        let beforeNoteJson = null;
        // Only update the beforeNoteJson if encryption is not applied, to avoid creating a faulty revision if an encrypted profile
        // has just been downloaded from the sync target and save is invoked when the note has not yet been decrypted
        if (oldNote && !oldNote.encryption_applied) {
            const changedSinceCollection = this.revisionService().changedSinceCollection(o.id);
            if (changedSinceCollection) {
                beforeNoteJson = await ItemChange_1.default.oldNoteContent(o.id);
            }
            else {
                beforeNoteJson = JSON.stringify(oldNote);
            }
        }
        const changedFields = [];
        if (oldNote) {
            for (const field in o) {
                if (!o.hasOwnProperty(field))
                    continue;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                if (o[field] !== oldNote[field]) {
                    changedFields.push(field);
                }
            }
        }
        syncDebugLog_1.default.info('Save Note: N:', o);
        let savedNote = await super.save(o, options);
        void ItemChange_1.default.add(BaseModel_1.default.TYPE_NOTE, savedNote.id, isNew ? ItemChange_1.default.TYPE_CREATE : ItemChange_1.default.TYPE_UPDATE, {
            changeSource, changeId: options === null || options === void 0 ? void 0 : options.changeId, beforeChangeItemJson: beforeNoteJson,
        });
        if (dispatchUpdateAction) {
            // The UI requires share_id -- if a new note, it will always be the empty string in the database
            // until processed by the share service. At present, loading savedNote from the database in this case
            // breaks tests.
            if (!('share_id' in savedNote) && isNew) {
                savedNote.share_id = '';
            }
            // Ensures that any note added to the state has all the required
            // properties for the UI to work.
            if (!('deleted_time' in savedNote) || !('share_id' in savedNote)) {
                const fields = (0, ArrayUtils_1.removeElement)((0, ArrayUtils_1.unique)(this.previewFields().concat(Object.keys(savedNote))), 'type_');
                savedNote = await this.load(savedNote.id, {
                    fields,
                });
            }
            this.dispatch(Object.assign({ type: 'NOTE_UPDATE_ONE', note: savedNote, provisional: isProvisional, ignoreProvisionalFlag: ignoreProvisionalFlag, changedFields: changedFields, changeId: options === null || options === void 0 ? void 0 : options.changeId }, options === null || options === void 0 ? void 0 : options.dispatchOptions));
        }
        if ('todo_due' in o || 'todo_completed' in o || 'is_todo' in o || 'is_conflict' in o) {
            this.dispatch({
                type: 'EVENT_NOTE_ALARM_FIELD_CHANGE',
                id: savedNote.id,
            });
        }
        return savedNote;
    }
    static async batchDelete(ids, options = {}) {
        if (!ids.length)
            return;
        ids = ids.slice();
        const changeSource = options && options.changeSource ? options.changeSource : null;
        const changeType = options && options.toTrash ? ItemChange_1.default.TYPE_UPDATE : ItemChange_1.default.TYPE_DELETE;
        const toTrash = options && !!options.toTrash;
        while (ids.length) {
            const processIds = ids.splice(0, 50);
            const notes = await Note.byIds(processIds);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const beforeChangeItems = {};
            for (const note of notes) {
                beforeChangeItems[note.id] = toTrash ? null : JSON.stringify(note);
            }
            if (toTrash) {
                const now = Date.now();
                const updateSql = [
                    'deleted_time = ?',
                    'updated_time = ?',
                ];
                const params = [
                    now,
                    now,
                ];
                if ('toTrashParentId' in options) {
                    updateSql.push('parent_id = ?');
                    params.push(options.toTrashParentId);
                }
                const sql = `
					UPDATE notes
					SET	${updateSql.join(', ')}						
					WHERE id IN (${this.escapeIdsForSql(processIds)})
				`;
                await this.db().exec({ sql, params });
            }
            else {
                // For now, we intentionally log only permanent batchDeletions.
                const actionLogger = ActionLogger_1.default.from(options.sourceDescription);
                const noteTitles = notes.map(note => note.title);
                actionLogger.addDescription(`titles: ${JSON.stringify(noteTitles)}`);
                await super.batchDelete(processIds, Object.assign(Object.assign({}, options), { sourceDescription: actionLogger }));
                const Revision = this.getClass('Revision');
                await Revision.deleteHistoryForNote(processIds, Object.assign(Object.assign({}, options), { sourceDescription: actionLogger }));
            }
            for (let i = 0; i < processIds.length; i++) {
                const id = processIds[i];
                void ItemChange_1.default.add(BaseModel_1.default.TYPE_NOTE, id, changeType, {
                    changeSource, beforeChangeItemJson: beforeChangeItems[id],
                });
                this.dispatch({
                    type: 'NOTE_DELETE',
                    id: id,
                    originalItem: notes[i],
                });
            }
        }
    }
    static async permanentlyDeleteMessage(noteIds) {
        let msg = '';
        if (noteIds.length === 1) {
            const note = await Note.load(noteIds[0]);
            if (!note)
                return null;
            msg = _('Permanently delete note "%s"?', substrWithEllipsis(note.title, 0, 32));
        }
        else {
            msg = _n('Permanently delete this note?', 'Permanently delete these %d notes?', noteIds.length, noteIds.length);
        }
        return msg;
    }
    static dueNotes() {
        return this.modelSelectAll('SELECT id, title, body, is_todo, todo_due, todo_completed, is_conflict FROM notes WHERE is_conflict = 0 AND is_todo = 1 AND todo_completed = 0 AND todo_due > ?', [time_1.default.unixMs()]);
    }
    static needAlarm(note) {
        return note.is_todo && !note.todo_completed && note.todo_due >= time_1.default.unixMs() && !note.is_conflict;
    }
    static dueDateObject(note) {
        if (!!note.is_todo && note.todo_due) {
            if (!this.dueDateObjects_)
                this.dueDateObjects_ = {};
            if (this.dueDateObjects_[note.todo_due])
                return this.dueDateObjects_[note.todo_due];
            this.dueDateObjects_[note.todo_due] = new Date(note.todo_due);
            return this.dueDateObjects_[note.todo_due];
        }
        return null;
    }
    // Tells whether the conflict between the local and remote note can be ignored.
    static mustHandleConflict(localNote, remoteNote) {
        // That shouldn't happen so throw an exception
        if (localNote.id !== remoteNote.id)
            throw new Error('Cannot handle conflict for two different notes');
        // For encrypted notes the conflict must always be handled
        if (localNote.encryption_cipher_text || remoteNote.encryption_cipher_text)
            return true;
        // Otherwise only handle the conflict if there's a different on the title or body
        if (localNote.title !== remoteNote.title)
            return true;
        if (localNote.body !== remoteNote.body)
            return true;
        return false;
    }
    static markupLanguageToLabel(markupLanguageId) {
        if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN)
            return 'Markdown';
        if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_HTML)
            return 'HTML';
        throw new Error(`Invalid markup language ID: ${markupLanguageId}`);
    }
    // When notes are sorted in "custom order", they are sorted by the "order" field first and,
    // in those cases, where the order field is the same for some notes, by created time.
    // Further sorting by todo completion status, if enabled, is handled separately.
    static customOrderByColumns() {
        return [{ by: 'order', dir: 'DESC' }, { by: 'user_created_time', dir: 'DESC' }];
    }
    // Update the note "order" field without changing the user timestamps,
    // which is generally what we want.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async updateNoteOrder_(note, order) {
        return Note.save(Object.assign(Object.assign({}, note), { order: order, user_updated_time: note.user_updated_time, updated_time: time_1.default.unixMs() }), { autoTimestamp: false, dispatchUpdateAction: false });
    }
    // This method will disable the NOTE_UPDATE_ONE action to prevent a lot
    // of unnecessary updates, so it's the caller's responsibility to update
    // the UI once the call is finished. This is done by listening to the
    // NOTE_IS_INSERTING_NOTES action in the application middleware.
    static async insertNotesAt(folderId, noteIds, index, uncompletedTodosOnTop, showCompletedTodos) {
        if (!noteIds.length)
            return;
        const defer = () => {
            this.dispatch({
                type: 'NOTE_IS_INSERTING_NOTES',
                value: false,
            });
        };
        this.dispatch({
            type: 'NOTE_IS_INSERTING_NOTES',
            value: true,
        });
        try {
            const getSortedNotes = async (folderId) => {
                const noteSql = `
					SELECT id, \`order\`, user_created_time, user_updated_time,
						is_todo, todo_completed, title
					FROM notes
					WHERE
						is_conflict = 0
						AND deleted_time = 0
						${showCompletedTodos ? '' : 'AND todo_completed = 0'}
					AND parent_id = ?
				`;
                const notes_raw = await this.modelSelectAll(noteSql, [folderId]);
                return await this.sortNotes(notes_raw, this.customOrderByColumns(), uncompletedTodosOnTop);
            };
            let notes = await getSortedNotes(folderId);
            // If the target index is the same as the source note index, exit now
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                if (note.id === noteIds[0] && index === i)
                    return defer();
            }
            // If some of the target notes have order = 0, set the order field to a reasonable
            // value to avoid moving the note. Using "smallest value / 2" (vs, for example,
            // subtracting a constant) ensures items remain in their current position at the
            // end, without ever reaching 0.
            let hasSetOrder = false;
            let previousOrder = 0;
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                if (!note.order) {
                    const newOrder = previousOrder ? previousOrder / 2 : note.user_created_time;
                    const updatedNote = await this.updateNoteOrder_(note, newOrder);
                    notes[i] = updatedNote;
                    hasSetOrder = true;
                }
                previousOrder = notes[i].order;
            }
            if (hasSetOrder)
                notes = await getSortedNotes(folderId);
            // If uncompletedTodosOnTop, then we should only consider the existing
            // order of same-completion-window notes. A completed todo or non-todo
            // dragged into the uncompleted list should end up at the start of the
            // completed/non-todo list, and an uncompleted todo dragged into the
            // completed/non-todo list should end up at the end of the uncompleted
            // list.
            // To make this determination we need to know the completion status of the
            // item we are dropping. We apply several simplifications:
            //  - We only care about completion status if uncompletedTodosOnTop
            //  - We only care about completion status / position if the item being
            //     moved is already in the current list; not if it is dropped from
            //     another notebook.
            //  - We only care about the completion status of the first item being
            //     moved. If a moving selection includes both uncompleted and
            //     completed/non-todo items, then the completed/non-todo items will
            //     not get "correct" position (although even defining a "more correct"
            //     outcome in such a case might be challenging).
            let relevantExistingNoteCount = notes.length;
            let firstRelevantNoteIndex = 0;
            let lastRelevantNoteIndex = notes.length - 1;
            if (uncompletedTodosOnTop) {
                const uncompletedTest = (n) => !(n.todo_completed || !n.is_todo);
                const targetNoteInNotebook = notes.find(n => n.id === noteIds[0]);
                if (targetNoteInNotebook) {
                    const targetUncompleted = uncompletedTest(targetNoteInNotebook);
                    const noteFilterCondition = targetUncompleted ? (n) => uncompletedTest(n) : (n) => !uncompletedTest(n);
                    relevantExistingNoteCount = notes.filter(noteFilterCondition).length;
                    firstRelevantNoteIndex = notes.findIndex(noteFilterCondition);
                    lastRelevantNoteIndex = notes.map(noteFilterCondition).lastIndexOf(true);
                }
            }
            // Find the order value for the first note to be inserted,
            // and the increment between the order values of each inserted notes.
            let newOrder = 0;
            let intervalBetweenNotes = 0;
            const defaultIntevalBetweenNotes = 60 * 60 * 1000;
            if (!relevantExistingNoteCount) { // If there's no (relevant) notes in the target notebook
                newOrder = Date.now();
                intervalBetweenNotes = defaultIntevalBetweenNotes;
            }
            else if (index > lastRelevantNoteIndex) { // Insert at the end (of relevant group)
                intervalBetweenNotes = notes[lastRelevantNoteIndex].order / (noteIds.length + 1);
                newOrder = notes[lastRelevantNoteIndex].order - intervalBetweenNotes;
            }
            else if (index <= firstRelevantNoteIndex) { // Insert at the beginning (of relevant group)
                const firstNoteOrder = notes[firstRelevantNoteIndex].order;
                if (firstNoteOrder >= Date.now()) {
                    intervalBetweenNotes = defaultIntevalBetweenNotes;
                    newOrder = firstNoteOrder + defaultIntevalBetweenNotes;
                }
                else {
                    intervalBetweenNotes = (Date.now() - firstNoteOrder) / (noteIds.length + 1);
                    newOrder = firstNoteOrder + intervalBetweenNotes * noteIds.length;
                }
            }
            else { // Normal insert
                let noteBefore = notes[index - 1];
                let noteAfter = notes[index];
                if (noteBefore.order === noteAfter.order) {
                    let previousOrder = noteBefore.order;
                    for (let i = index; i >= 0; i--) {
                        const n = notes[i];
                        if (n.order <= previousOrder) {
                            const o = previousOrder + defaultIntevalBetweenNotes;
                            const updatedNote = await this.updateNoteOrder_(n, o);
                            notes[i] = Object.assign(Object.assign({}, n), updatedNote);
                            previousOrder = o;
                        }
                        else {
                            previousOrder = n.order;
                        }
                    }
                    noteBefore = notes[index - 1];
                    noteAfter = notes[index];
                }
                intervalBetweenNotes = (noteBefore.order - noteAfter.order) / (noteIds.length + 1);
                newOrder = noteAfter.order + intervalBetweenNotes * noteIds.length;
            }
            // Set the order value for all the notes to be inserted
            for (const noteId of noteIds) {
                const note = await Note.load(noteId);
                if (!note)
                    throw new Error(`No such note: ${noteId}`);
                await this.updateNoteOrder_({
                    id: noteId,
                    parent_id: folderId,
                    user_updated_time: note.user_updated_time,
                }, newOrder);
                newOrder -= intervalBetweenNotes;
            }
        }
        finally {
            defer();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static handleTitleNaturalSorting(items, options) {
        if (options.order.length > 0 && options.order[0].by === 'title') {
            const collator = (0, getCollator_1.getCollator)();
            items.sort((a, b) => ((options.order[0].dir === 'ASC') ? 1 : -1) * collator.compare(a.title, b.title));
        }
    }
    static async createConflictNote(sourceNote, changeSource) {
        const conflictNote = Object.assign({}, sourceNote);
        delete conflictNote.id;
        delete conflictNote.is_shared;
        delete conflictNote.share_id;
        conflictNote.is_conflict = 1;
        conflictNote.conflict_original_id = sourceNote.id;
        return await Note.save(conflictNote, { autoTimestamp: false, changeSource: changeSource });
    }
}
Note.updateGeolocationEnabled_ = true;
Note.geolocationUpdating_ = false;
exports.default = Note;
