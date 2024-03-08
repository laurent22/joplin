import BaseModel, { DeleteOptions, ModelType } from '../BaseModel';
import BaseItem from './BaseItem';
import type FolderClass from './Folder';
import ItemChange from './ItemChange';
import Setting from './Setting';
import shim from '../shim';
import time from '../time';
import markdownUtils from '../markdownUtils';
import { FolderEntity, NoteEntity } from '../services/database/types';
import Tag from './Tag';
const { sprintf } = require('sprintf-js');
import Resource from './Resource';
import syncDebugLog from '../services/synchronizer/syncDebugLog';
import { toFileProtocolPath, toForwardSlashes } from '../path-utils';
const { pregQuote, substrWithEllipsis } = require('../string-utils.js');
const { _ } = require('../locale');
import { pull, removeElement, unique } from '../ArrayUtils';
import { LoadOptions, SaveOptions } from './utils/types';
import { getDisplayParentId, getTrashFolderId } from '../services/trash';
const urlUtils = require('../urlUtils.js');
const { isImageMimeType } = require('../resourceUtils');
const { MarkupToHtml } = require('@joplin/renderer');
const { ALL_NOTES_FILTER_ID } = require('../reserved-ids');

interface PreviewsOptions {
	order?: {
		by: string;
		dir: string;
	}[];
	conditions?: string[];
	conditionsParams?: any[];
	fields?: string[] | string;
	uncompletedTodosOnTop?: boolean;
	showCompletedTodos?: boolean;
	anywherePattern?: string;
	itemTypes?: string[];
	limit?: number;
	titlePattern?: string;
}

export default class Note extends BaseItem {

	public static updateGeolocationEnabled_ = true;
	private static geolocationUpdating_ = false;
	private static geolocationCache_: any;
	private static dueDateObjects_: any;

	public static tableName() {
		return 'notes';
	}

	public static fieldToLabel(field: string) {
		const fieldsToLabels: Record<string, string> = {
			title: _('title'),
			user_updated_time: _('updated date'),
			user_created_time: _('created date'),
			order: _('custom order'),
		};

		return field in fieldsToLabels ? fieldsToLabels[field] : field;
	}

	public static async serializeForEdit(note: NoteEntity) {
		return this.replaceResourceInternalToExternalLinks(await super.serialize(note, ['title', 'body']));
	}

	public static async unserializeForEdit(content: string) {
		content += `\n\ntype_: ${BaseModel.TYPE_NOTE}`;
		const output = await super.unserialize(content);
		if (!output.title) output.title = '';
		if (!output.body) output.body = '';
		output.body = await this.replaceResourceExternalToInternalLinks(output.body);
		return output;
	}

	public static async serializeAllProps(note: NoteEntity) {
		const fieldNames = this.fieldNames();
		fieldNames.push('type_');
		pull(fieldNames, 'title', 'body');
		return super.serialize(note, fieldNames);
	}

	public static minimalSerializeForDisplay(note: NoteEntity) {
		const n = { ...note };

		const fieldNames = this.fieldNames();

		if (!n.is_conflict) pull(fieldNames, 'is_conflict');
		if (!Number(n.latitude)) pull(fieldNames, 'latitude');
		if (!Number(n.longitude)) pull(fieldNames, 'longitude');
		if (!Number(n.altitude)) pull(fieldNames, 'altitude');
		if (!n.author) pull(fieldNames, 'author');
		if (!n.source_url) pull(fieldNames, 'source_url');
		if (!n.is_todo) {
			pull(fieldNames, 'is_todo');
			pull(fieldNames, 'todo_due');
			pull(fieldNames, 'todo_completed');
		}
		if (!n.application_data) pull(fieldNames, 'application_data');

		pull(fieldNames, 'type_');
		pull(fieldNames, 'title');
		pull(fieldNames, 'body');
		pull(fieldNames, 'created_time');
		pull(fieldNames, 'updated_time');
		pull(fieldNames, 'order');

		return super.serialize(n, fieldNames);
	}

	public static defaultTitle(noteBody: string) {
		return this.defaultTitleFromBody(noteBody);
	}

	public static defaultTitleFromBody(body: string) {
		return markdownUtils.titleFromBody(body);
	}

	public static geolocationUrl(note: NoteEntity) {
		if (!('latitude' in note) || !('longitude' in note)) throw new Error('Latitude or longitude is missing');
		if (!Number(note.latitude) && !Number(note.longitude)) throw new Error(_('This note does not have geolocation information.'));
		return this.geoLocationUrlFromLatLong(note.latitude, note.longitude);
	}

	public static geoLocationUrlFromLatLong(lat: number, long: number) {
		return sprintf('https://www.openstreetmap.org/?lat=%s&lon=%s&zoom=20', lat, long);
	}

	public static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	public static linkedItemIds(body: string): string[] {
		if (!body || body.length <= 32) return [];

		const links = urlUtils.extractResourceUrls(body);
		const itemIds = links.map((l: any) => l.itemId);
		return unique(itemIds);
	}

	public static async linkedItems(body: string) {
		const itemIds = this.linkedItemIds(body);
		const r = await BaseItem.loadItemsByIds(itemIds);
		return r;
	}

	public static async linkedItemIdsByType(type: ModelType, body: string) {
		const items = await this.linkedItems(body);
		const output: string[] = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type_ === type) output.push(item.id);
		}

		return output;
	}

	public static async linkedResourceIds(body: string) {
		return this.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, body);
	}

	public static async linkedNoteIds(body: string) {
		return this.linkedItemIdsByType(BaseModel.TYPE_NOTE, body);
	}

	public static async replaceResourceInternalToExternalLinks(body: string, options: any = null) {
		options = { useAbsolutePaths: false, ...options };

		// this.logger().debug('replaceResourceInternalToExternalLinks', 'options:', options, 'body:', body);

		const resourceIds = await this.linkedResourceIds(body);
		const Resource = this.getClass('Resource');

		for (let i = 0; i < resourceIds.length; i++) {
			const id = resourceIds[i];
			const resource = await Resource.load(id);
			if (!resource) continue;

			const isImage = isImageMimeType(resource.mime);

			// We add a timestamp parameter for images, so that when they
			// change, the preview is updated inside the note. This is not
			// needed for other resources since they are simple links.
			const timestampParam = isImage ? `?t=${resource.updated_time}` : '';
			const resourcePath = options.useAbsolutePaths ? toFileProtocolPath(Resource.fullPath(resource)) + timestampParam : Resource.relativePath(resource);
			body = body.replace(new RegExp(`:/${id}`, 'gi'), markdownUtils.escapeLinkUrl(resourcePath));
		}

		// this.logger().debug('replaceResourceInternalToExternalLinks result', body);

		return body;
	}

	public static async replaceResourceExternalToInternalLinks(body: string, options: any = null) {
		options = { useAbsolutePaths: false, ...options };

		const resourceDir = toForwardSlashes(Setting.value('resourceDir'));

		const pathsToTry = [];
		if (options.useAbsolutePaths) {
			pathsToTry.push(`file://${resourceDir}`);
			pathsToTry.push(`file:///${resourceDir}`);
			pathsToTry.push(`file://${shim.pathRelativeToCwd(resourceDir)}`);
			pathsToTry.push(`file:///${shim.pathRelativeToCwd(resourceDir)}`);
		} else {
			pathsToTry.push(Resource.baseRelativeDirectoryPath());
		}

		body = Note.replaceResourceExternalToInternalLinks_(pathsToTry, body);
		return body;
	}

	private static replaceResourceExternalToInternalLinks_(pathsToTry: string[], body: string) {
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

	public static new(parentId = '') {
		const output = super.new();
		output.parent_id = parentId;
		return output;
	}

	public static newTodo(parentId = '') {
		const output = this.new(parentId);
		output.is_todo = true;
		return output;
	}

	// Note: sort logic must be duplicated in previews().
	public static sortNotes(notes: NoteEntity[], orders: any[], uncompletedTodosOnTop: boolean) {
		const noteOnTop = (note: NoteEntity) => {
			return uncompletedTodosOnTop && note.is_todo && !note.todo_completed;
		};

		const noteFieldComp = (f1: any, f2: any) => {
			if (f1 === f2) return 0;
			return f1 < f2 ? -1 : +1;
		};

		// Makes the sort deterministic, so that if, for example, a and b have the
		// same updated_time, they aren't swapped every time a list is refreshed.
		const sortIdenticalNotes = (a: NoteEntity, b: NoteEntity) => {
			let r = null;
			r = noteFieldComp(a.user_updated_time, b.user_updated_time);
			if (r) return r;
			r = noteFieldComp(a.user_created_time, b.user_created_time);
			if (r) return r;

			const titleA = a.title ? a.title.toLowerCase() : '';
			const titleB = b.title ? b.title.toLowerCase() : '';
			r = noteFieldComp(titleA, titleB);
			if (r) return r;

			return noteFieldComp(a.id, b.id);
		};

		const collator = this.getNaturalSortingCollator();

		return notes.sort((a: NoteEntity, b: NoteEntity) => {
			if (noteOnTop(a) && !noteOnTop(b)) return -1;
			if (!noteOnTop(a) && noteOnTop(b)) return +1;

			let r = 0;

			for (let i = 0; i < orders.length; i++) {
				const order = orders[i];
				let aProp = (a as any)[order.by];
				let bProp = (b as any)[order.by];
				if (typeof aProp === 'string') aProp = aProp.toLowerCase();
				if (typeof bProp === 'string') bProp = bProp.toLowerCase();

				if (order.by === 'title') {
					r = -1 * collator.compare(aProp, bProp);
				} else {
					if (aProp < bProp) r = +1;
					if (aProp > bProp) r = -1;
				}
				if (order.dir === 'ASC') r = -r;
				if (r !== 0) return r;
			}

			return sortIdenticalNotes(a, b);
		});
	}

	public static previewFieldsWithDefaultValues(options: any = null) {
		return Note.defaultValues(this.previewFields(options));
	}

	public static previewFields(options: any = null) {
		options = { includeTimestamps: true, ...options };

		const output = ['id', 'title', 'is_todo', 'todo_completed', 'todo_due', 'parent_id', 'encryption_applied', 'order', 'markup_language', 'is_conflict', 'is_shared', 'share_id', 'deleted_time'];

		if (options.includeTimestamps) {
			output.push('updated_time');
			output.push('user_updated_time');
			output.push('user_created_time');
		}

		return output;
	}

	public static previewFieldsSql(fields: string[] = null) {
		if (fields === null) fields = this.previewFields();
		const escaped = this.db().escapeFields(fields);
		return Array.isArray(escaped) ? escaped.join(',') : escaped;
	}

	public static async loadFolderNoteByField(folderId: string, field: string, value: any) {
		if (!folderId) throw new Error('folderId is undefined');

		const options: PreviewsOptions = {
			conditions: [`\`${field}\` = ?`],
			conditionsParams: [value],
			fields: '*',
		};

		const results = await this.previews(folderId, options);
		return results.length ? results[0] : null;
	}

	public static async previews(parentId: string, options: PreviewsOptions = null) {
		// Note: ordering logic must be duplicated in sortNotes(), which is used
		// to sort already loaded notes.

		if (!options) options = {};
		if (!('order' in options)) options.order = [{ by: 'user_updated_time', dir: 'DESC' }, { by: 'user_created_time', dir: 'DESC' }, { by: 'title', dir: 'DESC' }, { by: 'id', dir: 'DESC' }];
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];
		if (!options.fields) options.fields = this.previewFields();
		if (!options.uncompletedTodosOnTop) options.uncompletedTodosOnTop = false;
		if (!('showCompletedTodos' in options)) options.showCompletedTodos = true;

		const autoAddedFields: string[] = [];
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

		const Folder: typeof FolderClass = BaseItem.getClass('Folder');

		const parentFolder: FolderEntity = await Folder.load(parentId, { fields: ['id', 'deleted_time'] });
		const parentInTrash = parentFolder ? !!parentFolder.deleted_time : false;
		const withinTrash = parentId === getTrashFolderId() || parentInTrash;

		// Conflicts are always displayed regardless of options, since otherwise
		// it's confusing to have conflicts but with an empty conflict folder.
		// For a similar reason we want to show all notes that have been deleted
		// in the trash.
		if (parentId === Folder.conflictFolderId() || withinTrash) options.showCompletedTodos = true;

		if (parentId === Folder.conflictFolderId()) {
			options.conditions.push('is_conflict = 1');
		} else if (withinTrash) {
			options.conditions.push('deleted_time > 0');
		} else {
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
			} else if (options.itemTypes.indexOf('todo') < 0) {
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
			let tempOptions: PreviewsOptions = { ...options };
			tempOptions.conditions = cond;

			const uncompletedTodos = await this.search(tempOptions);
			this.handleTitleNaturalSorting(uncompletedTodos, tempOptions);

			cond = options.conditions.slice();
			if (hasNotes && hasTodos) {
				cond.push('(is_todo = 0 OR (is_todo = 1 AND todo_completed > 0))');
			} else {
				cond.push('(is_todo = 1 AND todo_completed > 0)');
			}

			tempOptions = { ...options };
			tempOptions.conditions = cond;
			if ('limit' in tempOptions) tempOptions.limit -= uncompletedTodos.length;
			const theRest = await this.search(tempOptions);
			this.handleTitleNaturalSorting(theRest, tempOptions);

			return uncompletedTodos.concat(theRest);
		}

		if (hasNotes && hasTodos) {
			// Nothing
		} else if (hasNotes) {
			options.conditions.push('is_todo = 0');
		} else if (hasTodos) {
			options.conditions.push('is_todo = 1');
		}

		let results = await this.search(options);
		this.handleTitleNaturalSorting(results, options);

		if (withinTrash) {
			const folderIds = results.map(n => n.parent_id).filter(id => !!id);
			const allFolders: FolderEntity[] = await Folder.byIds(folderIds, { fields: ['id', 'parent_id', 'deleted_time', 'title'] });

			// In the results, we only include notes that were originally at the
			// root (no parent), or that are inside a folder that has also been
			// deleted.
			results = results.filter(note => {
				const noteFolder = allFolders.find(f => f.id === note.parent_id);
				return getDisplayParentId(note, noteFolder) === parentId;
			});
		}

		if (autoAddedFields.length) {
			results = results.map(n => {
				n = { ...n };
				for (const field of autoAddedFields) {
					delete (n as any)[field];
				}
				return n;
			});
		}

		return results;
	}

	public static preview(noteId: string, options: any = null) {
		if (!options) options = { fields: null };
		return this.modelSelectOne(`SELECT ${this.previewFieldsSql(options.fields)} FROM notes WHERE is_conflict = 0 AND id = ?`, [noteId]);
	}

	public static async search(options: any = null): Promise<NoteEntity[]> {
		if (!options) options = {};
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];

		if (options.bodyPattern) {
			const pattern = options.bodyPattern.replace(/\*/g, '%');
			options.conditions.push('body LIKE ?');
			options.conditionsParams.push(pattern);
		}

		return super.search(options);
	}

	public static conflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 1');
	}

	public static async conflictedCount() {
		const r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 1');
		return r && r.total ? r.total : 0;
	}

	public static unconflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
	}

	public static async updateGeolocation(noteId: string): Promise<NoteEntity | null> {
		if (!Setting.value('trackLocation')) return null;
		if (!Note.updateGeolocationEnabled_) return null;

		const startWait = time.unixMs();
		while (true) {
			if (!this.geolocationUpdating_) break;
			this.logger().info('Waiting for geolocation update...');
			await time.sleep(1);
			if (startWait + 1000 * 20 < time.unixMs()) {
				this.logger().warn(`Failed to update geolocation for: timeout: ${noteId}`);
				return null;
			}
		}

		let geoData = null;
		if (this.geolocationCache_ && this.geolocationCache_.timestamp + 1000 * 60 * 10 > time.unixMs()) {
			geoData = { ...this.geolocationCache_ };
		} else {
			this.geolocationUpdating_ = true;

			this.logger().info('Fetching geolocation...');
			try {
				geoData = await shim.Geolocation.currentPosition();
			} catch (error) {
				this.logger().error(`Could not get lat/long for note ${noteId}: `, error);
				geoData = null;
			}

			this.geolocationUpdating_ = false;

			if (!geoData) return null;

			this.logger().info('Got lat/long');
			this.geolocationCache_ = geoData;
		}

		this.logger().info(`Updating lat/long of note ${noteId}`);

		const note = await Note.load(noteId);
		if (!note) return null; // Race condition - note has been deleted in the meantime

		note.longitude = geoData.coords.longitude;
		note.latitude = geoData.coords.latitude;
		note.altitude = geoData.coords.altitude;
		await Note.save(note, { ignoreProvisionalFlag: true });

		return note;
	}

	public static filter(note: NoteEntity) {
		if (!note) return note;

		const output = super.filter(note);
		if ('longitude' in output) output.longitude = Number(!output.longitude ? 0 : output.longitude).toFixed(8);
		if ('latitude' in output) output.latitude = Number(!output.latitude ? 0 : output.latitude).toFixed(8);
		if ('altitude' in output) output.altitude = Number(!output.altitude ? 0 : output.altitude).toFixed(4);
		return output;
	}

	public static async copyToFolder(noteId: string, folderId: string) {
		if (folderId === this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot copy note to "%s" notebook', this.getClass('Folder').conflictFolderTitle()));

		return Note.duplicate(noteId, {
			changes: {
				parent_id: folderId,
				is_conflict: 0, // Also reset the conflict flag in case we're moving the note out of the conflict folder
				conflict_original_id: '', // Reset parent id as well.
			},
		});
	}

	public static async moveToFolder(noteId: string, folderId: string) {
		if (folderId === this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot move note to "%s" notebook', this.getClass('Folder').conflictFolderTitle()));

		// When moving a note to a different folder, the user timestamp is not
		// updated. However updated_time is updated so that the note can be
		// synced later on.
		//
		// We also reset deleted_time, so that if a deleted note is moved to
		// that folder it is restored. If it wasn't deleted, it does nothing.

		const modifiedNote: NoteEntity = {
			id: noteId,
			parent_id: folderId,
			is_conflict: 0,
			conflict_original_id: '',
			deleted_time: 0,
			updated_time: time.unixMs(),
		};

		return Note.save(modifiedNote, { autoTimestamp: false });
	}

	public static changeNoteType(note: NoteEntity, type: string) {
		if (!('is_todo' in note)) throw new Error('Missing "is_todo" property');

		const newIsTodo = type === 'todo' ? 1 : 0;

		if (Number(note.is_todo) === newIsTodo) return note;

		const output = { ...note };
		output.is_todo = newIsTodo;
		output.todo_due = 0;
		output.todo_completed = 0;

		return output;
	}

	public static toggleIsTodo(note: NoteEntity) {
		return this.changeNoteType(note, note.is_todo ? 'note' : 'todo');
	}

	public static toggleTodoCompleted(note: NoteEntity) {
		if (!('todo_completed' in note)) throw new Error('Missing "todo_completed" property');

		note = { ...note };
		if (note.todo_completed) {
			note.todo_completed = 0;
		} else {
			note.todo_completed = Date.now();
		}

		return note;
	}

	public static async duplicateMultipleNotes(noteIds: string[], options: any = null) {
		// if options.uniqueTitle is true, a unique title for the duplicated file will be assigned.
		const ensureUniqueTitle = options && options.ensureUniqueTitle;

		for (const noteId of noteIds) {
			const noteOptions: any = {};

			// If ensureUniqueTitle is truthy, set the original note's name as root for the unique title.
			if (ensureUniqueTitle) {
				const originalNote = await Note.load(noteId);
				noteOptions.uniqueTitle = originalNote.title;
			}

			await Note.duplicate(noteId, noteOptions);
		}
	}

	private static async duplicateNoteResources(noteBody: string): Promise<string> {
		const resourceIds = await this.linkedResourceIds(noteBody);
		let newBody: string = noteBody;

		for (const resourceId of resourceIds) {
			const newResource = await Resource.duplicateResource(resourceId);
			const regex = new RegExp(resourceId, 'gi');
			newBody = newBody.replace(regex, newResource.id);
		}

		return newBody;
	}

	public static async duplicate(noteId: string, options: any = null) {
		const changes = options && options.changes;
		const uniqueTitle = options && options.uniqueTitle;
		const duplicateResources = options && !!options.duplicateResources;

		const originalNote: NoteEntity = await Note.load(noteId);
		if (!originalNote) throw new Error(`Unknown note: ${noteId}`);

		const newNote = { ...originalNote };
		const fieldsToReset = [
			'id',
			'created_time',
			'updated_time',
			'user_created_time',
			'user_updated_time',
			'is_shared',
		];

		for (const field of fieldsToReset) {
			delete (newNote as any)[field];
		}

		for (const n in changes) {
			if (!changes.hasOwnProperty(n)) continue;
			(newNote as any)[n] = changes[n];
		}

		if (uniqueTitle) {
			const title = await Note.findUniqueItemTitle(uniqueTitle);
			newNote.title = title;
		}

		if (duplicateResources) newNote.body = await this.duplicateNoteResources(newNote.body);

		const newNoteSaved = await this.save(newNote);
		const originalTags = await Tag.tagsByNoteId(noteId);
		for (const tagToAdd of originalTags) {
			await Tag.addNote(tagToAdd.id, newNoteSaved.id);
		}

		return this.save(newNoteSaved);
	}

	public static async noteIsOlderThan(noteId: string, date: number) {
		const n = await this.db().selectOne('SELECT updated_time FROM notes WHERE id = ?', [noteId]);
		if (!n) throw new Error(`No such note: ${noteId}`);
		return n.updated_time < date;
	}

	public static load(id: string, options: LoadOptions = null): Promise<NoteEntity> {
		return super.load(id, options);
	}

	public static async save(o: NoteEntity, options: SaveOptions = null): Promise<NoteEntity> {
		const isNew = this.isNew(o, options);

		// If true, this is a provisional note - it will be saved permanently
		// only if the user makes changes to it.
		const isProvisional = options && !!options.provisional;

		// If true, saving the note will not change the provisional flag of the
		// note. This is used for background processing that it not initiated by
		// the user. For example when setting the geolocation of a note.
		const ignoreProvisionalFlag = options && !!options.ignoreProvisionalFlag;

		const dispatchUpdateAction = options ? options.dispatchUpdateAction !== false : true;
		if (isNew && !o.source) o.source = Setting.value('appName');
		if (isNew && !o.source_application) o.source_application = Setting.value('appId');
		if (isNew && !('order' in o)) o.order = Date.now();
		if (isNew && !('deleted_time' in o)) o.deleted_time = 0;

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
		const oldNote = !isNew && o.id ? await Note.load(o.id) : null;

		syncDebugLog.info('Save Note: P:', oldNote);

		let beforeNoteJson = null;
		if (oldNote && this.revisionService().isOldNote(o.id)) {
			beforeNoteJson = JSON.stringify(oldNote);
		}

		const changedFields = [];

		if (oldNote) {
			for (const field in o) {
				if (!o.hasOwnProperty(field)) continue;
				if ((o as any)[field] !== (oldNote as any)[field]) {
					changedFields.push(field);
				}
			}
		}

		syncDebugLog.info('Save Note: N:', o);

		let savedNote = await super.save(o, options);

		void ItemChange.add(BaseModel.TYPE_NOTE, savedNote.id, isNew ? ItemChange.TYPE_CREATE : ItemChange.TYPE_UPDATE, changeSource, beforeNoteJson);

		if (dispatchUpdateAction) {
			// Ensures that any note added to the state has all the required
			// properties for the UI to work.
			if (!('deleted_time' in savedNote)) {
				const fields = removeElement(unique(this.previewFields().concat(Object.keys(savedNote))), 'type_');
				savedNote = await this.load(savedNote.id, {
					fields,
				});
			}

			this.dispatch({
				type: 'NOTE_UPDATE_ONE',
				note: savedNote,
				provisional: isProvisional,
				ignoreProvisionalFlag: ignoreProvisionalFlag,
				changedFields: changedFields,
			});
		}

		if ('todo_due' in o || 'todo_completed' in o || 'is_todo' in o || 'is_conflict' in o) {
			this.dispatch({
				type: 'EVENT_NOTE_ALARM_FIELD_CHANGE',
				id: savedNote.id,
			});
		}

		return savedNote;
	}

	public static async batchDelete(ids: string[], options: DeleteOptions = null) {
		if (!ids.length) return;

		ids = ids.slice();

		const changeSource = options && options.changeSource ? options.changeSource : null;
		const changeType = options && options.toTrash ? ItemChange.TYPE_UPDATE : ItemChange.TYPE_DELETE;
		const toTrash = options && !!options.toTrash;

		while (ids.length) {
			const processIds = ids.splice(0, 50);

			const notes = await Note.byIds(processIds);
			const beforeChangeItems: any = {};
			for (const note of notes) {
				beforeChangeItems[note.id] = toTrash ? null : JSON.stringify(note);
			}

			if (toTrash) {
				const now = Date.now();

				const updateSql = [
					'deleted_time = ?',
					'updated_time = ?',
				];

				const params: any[] = [
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
					WHERE id IN ("${processIds.join('","')}")
				`;

				await this.db().exec({ sql, params });
			} else {
				await super.batchDelete(processIds, options);
			}

			for (let i = 0; i < processIds.length; i++) {
				const id = processIds[i];
				void ItemChange.add(BaseModel.TYPE_NOTE, id, changeType, changeSource, beforeChangeItems[id]);

				this.dispatch({
					type: 'NOTE_DELETE',
					id: id,
				});
			}
		}
	}

	public static async permanentlyDeleteMessage(noteIds: string[]): Promise<string|null> {
		let msg = '';
		if (noteIds.length === 1) {
			const note = await Note.load(noteIds[0]);
			if (!note) return null;
			msg = _('Permanently delete note "%s"?', substrWithEllipsis(note.title, 0, 32));
		} else {
			msg = _('Permanently delete these %d notes?', noteIds.length);
		}
		return msg;
	}

	public static dueNotes() {
		return this.modelSelectAll('SELECT id, title, body, is_todo, todo_due, todo_completed, is_conflict FROM notes WHERE is_conflict = 0 AND is_todo = 1 AND todo_completed = 0 AND todo_due > ?', [time.unixMs()]);
	}

	public static needAlarm(note: NoteEntity) {
		return note.is_todo && !note.todo_completed && note.todo_due >= time.unixMs() && !note.is_conflict;
	}

	public static dueDateObject(note: NoteEntity) {
		if (!!note.is_todo && note.todo_due) {
			if (!this.dueDateObjects_) this.dueDateObjects_ = {};
			if (this.dueDateObjects_[note.todo_due]) return this.dueDateObjects_[note.todo_due];
			this.dueDateObjects_[note.todo_due] = new Date(note.todo_due);
			return this.dueDateObjects_[note.todo_due];
		}

		return null;
	}

	// Tells whether the conflict between the local and remote note can be ignored.
	public static mustHandleConflict(localNote: NoteEntity, remoteNote: NoteEntity) {
		// That shouldn't happen so throw an exception
		if (localNote.id !== remoteNote.id) throw new Error('Cannot handle conflict for two different notes');

		// For encrypted notes the conflict must always be handled
		if (localNote.encryption_cipher_text || remoteNote.encryption_cipher_text) return true;

		// Otherwise only handle the conflict if there's a different on the title or body
		if (localNote.title !== remoteNote.title) return true;
		if (localNote.body !== remoteNote.body) return true;

		return false;
	}

	public static markupLanguageToLabel(markupLanguageId: number) {
		if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) return 'Markdown';
		if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_HTML) return 'HTML';
		throw new Error(`Invalid markup language ID: ${markupLanguageId}`);
	}

	// When notes are sorted in "custom order", they are sorted by the "order" field first and,
	// in those cases, where the order field is the same for some notes, by created time.
	// Further sorting by todo completion status, if enabled, is handled separately.
	public static customOrderByColumns() {
		return [{ by: 'order', dir: 'DESC' }, { by: 'user_created_time', dir: 'DESC' }];
	}

	// Update the note "order" field without changing the user timestamps,
	// which is generally what we want.
	private static async updateNoteOrder_(note: NoteEntity, order: any) {
		return Note.save({ ...note, order: order,
			user_updated_time: note.user_updated_time,
			updated_time: time.unixMs() }, { autoTimestamp: false, dispatchUpdateAction: false });
	}

	// This method will disable the NOTE_UPDATE_ONE action to prevent a lot
	// of unnecessary updates, so it's the caller's responsibility to update
	// the UI once the call is finished. This is done by listening to the
	// NOTE_IS_INSERTING_NOTES action in the application middleware.
	public static async insertNotesAt(folderId: string, noteIds: string[], index: number, uncompletedTodosOnTop: boolean, showCompletedTodos: boolean) {
		if (!noteIds.length) return;

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
			const getSortedNotes = async (folderId: string) => {
				const noteSql = `
					SELECT id, \`order\`, user_created_time, user_updated_time,
						is_todo, todo_completed, title
					FROM notes
					WHERE
						is_conflict = 0
						${showCompletedTodos ? '' : 'AND todo_completed = 0'}
					AND parent_id = ?
				`;
				const notes_raw: NoteEntity[] = await this.modelSelectAll(noteSql, [folderId]);
				return await this.sortNotes(notes_raw, this.customOrderByColumns(), uncompletedTodosOnTop);
			};

			let notes = await getSortedNotes(folderId);

			// If the target index is the same as the source note index, exit now
			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				if (note.id === noteIds[0] && index === i) return defer();
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

			if (hasSetOrder) notes = await getSortedNotes(folderId);

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
				const uncompletedTest = (n: NoteEntity) => !(n.todo_completed || !n.is_todo);
				const targetNoteInNotebook = notes.find(n => n.id === noteIds[0]);
				if (targetNoteInNotebook) {
					const targetUncompleted = uncompletedTest(targetNoteInNotebook);
					const noteFilterCondition = targetUncompleted ? (n: NoteEntity) => uncompletedTest(n) : (n: NoteEntity) => !uncompletedTest(n);
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
			} else if (index > lastRelevantNoteIndex) { // Insert at the end (of relevant group)
				intervalBetweenNotes = notes[lastRelevantNoteIndex].order / (noteIds.length + 1);
				newOrder = notes[lastRelevantNoteIndex].order - intervalBetweenNotes;
			} else if (index <= firstRelevantNoteIndex) { // Insert at the beginning (of relevant group)
				const firstNoteOrder = notes[firstRelevantNoteIndex].order;
				if (firstNoteOrder >= Date.now()) {
					intervalBetweenNotes = defaultIntevalBetweenNotes;
					newOrder = firstNoteOrder + defaultIntevalBetweenNotes;
				} else {
					intervalBetweenNotes = (Date.now() - firstNoteOrder) / (noteIds.length + 1);
					newOrder = firstNoteOrder + intervalBetweenNotes * noteIds.length;
				}
			} else { // Normal insert
				let noteBefore = notes[index - 1];
				let noteAfter = notes[index];

				if (noteBefore.order === noteAfter.order) {
					let previousOrder = noteBefore.order;
					for (let i = index; i >= 0; i--) {
						const n = notes[i];
						if (n.order <= previousOrder) {
							const o = previousOrder + defaultIntevalBetweenNotes;
							const updatedNote = await this.updateNoteOrder_(n, o);
							notes[i] = { ...n, ...updatedNote };
							previousOrder = o;
						} else {
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
				if (!note) throw new Error(`No such note: ${noteId}`);

				await this.updateNoteOrder_({
					id: noteId,
					parent_id: folderId,
					user_updated_time: note.user_updated_time,
				}, newOrder);

				newOrder -= intervalBetweenNotes;
			}
		} finally {
			defer();
		}
	}

	public static handleTitleNaturalSorting(items: NoteEntity[], options: any) {
		if (options.order.length > 0 && options.order[0].by === 'title') {
			const collator = this.getNaturalSortingCollator();
			items.sort((a, b) => ((options.order[0].dir === 'ASC') ? 1 : -1) * collator.compare(a.title, b.title));
		}
	}

	public static getNaturalSortingCollator() {
		const collatorLocale = Setting.value('locale').slice(0, 2);
		return new Intl.Collator(collatorLocale, { numeric: true, sensitivity: 'base' });
	}

	public static async createConflictNote(sourceNote: NoteEntity, changeSource: number): Promise<NoteEntity> {
		const conflictNote = { ...sourceNote };
		delete conflictNote.id;
		delete conflictNote.is_shared;
		delete conflictNote.share_id;
		conflictNote.is_conflict = 1;
		conflictNote.conflict_original_id = sourceNote.id;
		return await Note.save(conflictNote, { autoTimestamp: false, changeSource: changeSource });
	}
}
