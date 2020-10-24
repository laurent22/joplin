const { uuid } = require('lib/uuid.js');
const moment = require('moment');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const Resource = require('lib/models/Resource.js');
const Setting = require('lib/models/Setting.js');
const { MarkupToHtml } = require('lib/joplin-renderer');
const { enexXmlToMd } = require('./import-enex-md-gen.js');
const { enexXmlToHtml } = require('./import-enex-html-gen.js');
const { time } = require('lib/time-utils.js');
const Levenshtein = require('levenshtein');
const md5 = require('md5');
const { Base64Decode } = require('base64-stream');
const md5File = require('md5-file');

// const Promise = require('promise');
const fs = require('fs-extra');

function dateToTimestamp(s, zeroIfInvalid = false) {
	// Most dates seem to be in this format
	let m = moment(s, 'YYYYMMDDTHHmmssZ');

	// But sometimes they might be in this format eg. 20180306T91108 AMZ
	// https://github.com/laurent22/joplin/issues/557
	if (!m.isValid()) m = moment(s, 'YYYYMMDDThmmss AZ');

	if (!m.isValid()) {
		if (zeroIfInvalid) return 0;
		throw new Error(`Invalid date: ${s}`);
	}

	return m.toDate().getTime();
}

function extractRecognitionObjId(recognitionXml) {
	const r = recognitionXml.match(/objID="(.*?)"/);
	return r && r.length >= 2 ? r[1] : null;
}

async function decodeBase64File(sourceFilePath, destFilePath) {
	return new Promise(function(resolve, reject) {
		// Note: we manually handle closing the file so that we can
		// force flusing it before close. This is needed because
		// "end" might be called before the file has been flushed
		// to disk, thus resulting in the calling code to find a
		// file with size 0.

		const destFile = fs.openSync(destFilePath, 'w');
		const sourceStream = fs.createReadStream(sourceFilePath);
		const destStream = fs.createWriteStream(destFile, {
			fd: destFile,
			autoClose: false,
		});
		sourceStream.pipe(new Base64Decode()).pipe(destStream);

		sourceStream.on('end', () => {
			fs.fdatasyncSync(destFile);
			fs.closeSync(destFile);
			resolve();
		});

		sourceStream.on('error', (error) => reject(error));
	});
}

async function md5FileAsync(filePath) {
	return new Promise((resolve, reject) => {
		md5File(filePath, (error, hash) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(hash);
		});
	});
}

function removeUndefinedProperties(note) {
	const output = {};
	for (const n in note) {
		if (!note.hasOwnProperty(n)) continue;
		const v = note[n];
		if (v === undefined || v === null) continue;
		output[n] = v;
	}
	return output;
}

function levenshteinPercent(s1, s2) {
	const l = new Levenshtein(s1, s2);
	if (!s1.length || !s2.length) return 1;
	return Math.abs(l.distance / s1.length);
}

async function fuzzyMatch(note) {
	if (note.created_time < time.unixMs() - 1000 * 60 * 60 * 24 * 360) {
		const notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0 AND created_time = ? AND title = ?', [note.created_time, note.title]);
		return notes.length !== 1 ? null : notes[0];
	}

	const notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0 AND created_time = ?', [note.created_time]);
	if (notes.length === 0) return null;
	if (notes.length === 1) return notes[0];

	let lowestL = 1;
	let lowestN = null;
	for (let i = 0; i < notes.length; i++) {
		const n = notes[i];
		const l = levenshteinPercent(note.title, n.title);
		if (l < lowestL) {
			lowestL = l;
			lowestN = n;
		}
	}

	if (lowestN && lowestL < 0.2) return lowestN;

	return null;
}

// At this point we have the resource has it's been parsed from the XML, but additional
// processing needs to be done to get the final resource file, its size, MD5, etc.
async function processNoteResource(resource) {
	if (resource.dataEncoding == 'base64') {
		const decodedFilePath = `${resource.dataFilePath}.decoded`;
		await decodeBase64File(resource.dataFilePath, decodedFilePath);
		resource.dataFilePath = decodedFilePath;
	} else if (resource.dataEncoding) {
		throw new Error(`Cannot decode resource with encoding: ${resource.dataEncoding}`);
	}

	const stats = fs.statSync(resource.dataFilePath);
	resource.size = stats.size;

	if (!resource.id) {
		// If no resource ID is present, the resource ID is actually the MD5 of the data.
		// This ID will match the "hash" attribute of the corresponding <en-media> tag.
		// resourceId = md5(decodedData);
		resource.id = await md5FileAsync(resource.dataFilePath);
	}

	if (!resource.id || !resource.size) {
		const debugTemp = Object.assign({}, resource);
		debugTemp.data = debugTemp.data ? `${debugTemp.data.substr(0, 32)}...` : debugTemp.data;
		throw new Error(`This resource was not added because it has no ID or no content: ${JSON.stringify(debugTemp)}`);
	}

	return resource;
}

async function saveNoteResources(note) {
	let resourcesCreated = 0;
	for (let i = 0; i < note.resources.length; i++) {
		const resource = note.resources[i];

		const toSave = Object.assign({}, resource);
		delete toSave.dataFilePath;
		delete toSave.dataEncoding;

		// The same resource sometimes appear twice in the same enex (exact same ID and file).
		// In that case, just skip it - it means two different notes might be linked to the
		// same resource.
		const existingResource = await Resource.load(toSave.id);
		if (existingResource) continue;

		await fs.move(resource.dataFilePath, Resource.fullPath(toSave), { overwrite: true });
		await Resource.save(toSave, { isNew: true });
		resourcesCreated++;
	}
	return resourcesCreated;
}

async function saveNoteTags(note) {
	let notesTagged = 0;
	for (let i = 0; i < note.tags.length; i++) {
		const tagTitle = note.tags[i];

		let tag = await Tag.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.save({ title: tagTitle });

		await Tag.addNote(tag.id, note.id);

		notesTagged++;
	}
	return notesTagged;
}

async function saveNoteToStorage(note, importOptions) {
	importOptions = Object.assign({}, {
		fuzzyMatching: false,
	}, importOptions);

	note = Note.filter(note);

	const existingNote = importOptions.fuzzyMatching ? await fuzzyMatch(note) : null;

	const result = {
		noteCreated: false,
		noteUpdated: false,
		noteSkipped: false,
		resourcesCreated: 0,
		notesTagged: 0,
	};

	const resourcesCreated = await saveNoteResources(note, importOptions);
	result.resourcesCreated += resourcesCreated;

	const notesTagged = await saveNoteTags(note);
	result.notesTagged += notesTagged;

	if (existingNote) {
		const diff = BaseModel.diffObjects(existingNote, note);
		delete diff.tags;
		delete diff.resources;
		delete diff.id;

		if (!Object.getOwnPropertyNames(diff).length) {
			result.noteSkipped = true;
			return result;
		}

		diff.id = existingNote.id;
		diff.type_ = existingNote.type_;
		await Note.save(diff, { autoTimestamp: false });
		result.noteUpdated = true;
	} else {
		await Note.save(note, {
			isNew: true,
			autoTimestamp: false,
		});
		result.noteCreated = true;
	}

	return result;
}

function importEnex(parentFolderId, filePath, importOptions = null) {
	if (!importOptions) importOptions = {};
	// console.info(JSON.stringify({importOptions}, null, 2));
	if (!('fuzzyMatching' in importOptions)) importOptions.fuzzyMatching = false;
	if (!('onProgress' in importOptions)) importOptions.onProgress = function() {};
	if (!('onError' in importOptions)) importOptions.onError = function() {};

	return new Promise((resolve, reject) => {
		const progressState = {
			loaded: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			resourcesCreated: 0,
			notesTagged: 0,
		};

		const stream = fs.createReadStream(filePath);

		const options = {};
		const strict = true;
		const saxStream = require('sax').createStream(strict, options);

		const nodes = []; // LIFO list of nodes so that we know in which node we are in the onText event
		let note = null;
		let noteAttributes = null;
		let noteResource = null;
		let noteResourceAttributes = null;
		let noteResourceRecognition = null;
		const notes = [];
		let processingNotes = false;

		stream.on('error', error => {
			reject(new Error(error.toString()));
		});

		function currentNodeName() {
			if (!nodes.length) return null;
			return nodes[nodes.length - 1].name;
		}

		function currentNodeAttributes() {
			if (!nodes.length) return {};
			return nodes[nodes.length - 1].attributes;
		}

		async function processNotes() {
			if (processingNotes) return false;

			try {
				processingNotes = true;
				stream.pause();

				while (notes.length) {
					const note = notes.shift();

					for (let i = 0; i < note.resources.length; i++) {
						let resource = note.resources[i];

						try {
							resource = await processNoteResource(resource);
						} catch (error) {
							importOptions.onError(error);
							continue;
						}

						note.resources[i] = resource;
					}

					const body = importOptions.outputFormat === 'html' ?
						await enexXmlToHtml(note.bodyXml, note.resources) :
						await enexXmlToMd(note.bodyXml, note.resources);
					delete note.bodyXml;

					note.markup_language = importOptions.outputFormat === 'html' ?
						MarkupToHtml.MARKUP_LANGUAGE_HTML :
						MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;

					// console.info('*************************************************************************');
					// console.info(body);
					// console.info('*************************************************************************');

					note.id = uuid.create();
					note.parent_id = parentFolderId;
					note.body = body;

					// Notes in enex files always have a created timestamp but not always an
					// updated timestamp (it the note has never been modified). For sync
					// we require an updated_time property, so set it to create_time in that case
					if (!note.updated_time) note.updated_time = note.created_time;

					const result = await saveNoteToStorage(note, importOptions);

					if (result.noteUpdated) {
						progressState.updated++;
					} else if (result.noteCreated) {
						progressState.created++;
					} else if (result.noteSkipped) {
						progressState.skipped++;
					}
					progressState.resourcesCreated += result.resourcesCreated;
					progressState.notesTagged += result.notesTagged;
					importOptions.onProgress(progressState);
				}
			} catch (error) {
				console.error(error);
			}

			stream.resume();
			processingNotes = false;
			return true;
		}

		saxStream.on('error', error => {
			importOptions.onError(error);
		});

		saxStream.on('text', function(text) {
			const n = currentNodeName();

			if (noteAttributes) {
				noteAttributes[n] = text;
			} else if (noteResourceAttributes) {
				noteResourceAttributes[n] = text;
			} else if (noteResource) {
				if (n == 'data') {
					if (!noteResource.dataEncoding) {
						const attr = currentNodeAttributes();
						noteResource.dataEncoding = attr.encoding;
					}

					if (!noteResource.dataFilePath) {
						noteResource.dataFilePath = `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.base64`;
					}

					fs.appendFileSync(noteResource.dataFilePath, text);
				} else {
					if (!(n in noteResource)) noteResource[n] = '';
					noteResource[n] += text;
				}
			} else if (note) {
				if (n == 'title') {
					note.title = text;
				} else if (n == 'created') {
					note.created_time = dateToTimestamp(text);
				} else if (n == 'updated') {
					note.updated_time = dateToTimestamp(text);
				} else if (n == 'tag') {
					note.tags.push(text);
				} else if (n == 'note') {
					// Ignore - white space between the opening tag <note> and the first sub-tag
				} else if (n == 'content') {
					// Ignore - white space between the opening tag <content> and the <![CDATA[< block where the content actually is
				} else {
					console.warn(`Unsupported note tag: ${n}`);
				}
			}
		});

		saxStream.on('opentag', function(node) {
			const n = node.name.toLowerCase();
			nodes.push(node);

			if (n == 'note') {
				note = {
					resources: [],
					tags: [],
				};
			} else if (n == 'resource-attributes') {
				noteResourceAttributes = {};
			} else if (n == 'recognition') {
				if (noteResource) noteResourceRecognition = {};
			} else if (n == 'note-attributes') {
				noteAttributes = {};
			} else if (n == 'resource') {
				noteResource = {};
			}
		});

		saxStream.on('cdata', function(data) {
			const n = currentNodeName();

			if (noteResourceRecognition) {
				noteResourceRecognition.objID = extractRecognitionObjId(data);
			} else if (note) {
				if (n == 'content') {
					if ('bodyXml' in note) {
						note.bodyXml += data;
					} else {
						note.bodyXml = data;
					}
				}
			}
		});

		saxStream.on('closetag', async function(n) {
			nodes.pop();

			if (n == 'note') {
				note = removeUndefinedProperties(note);

				progressState.loaded++;
				importOptions.onProgress(progressState);

				notes.push(note);

				if (notes.length >= 10) {
					processNotes().catch(error => {
						importOptions.onError(error);
					});
				}
				note = null;
			} else if (n == 'recognition' && noteResource) {
				noteResource.id = noteResourceRecognition.objID;
				noteResourceRecognition = null;
			} else if (n == 'resource-attributes') {
				noteResource.filename = noteResourceAttributes['file-name'];
				if (noteResourceAttributes['source-url']) noteResource.sourceUrl = noteResourceAttributes['source-url'];
				noteResourceAttributes = null;
			} else if (n == 'note-attributes') {
				note.latitude = noteAttributes.latitude;
				note.longitude = noteAttributes.longitude;
				note.altitude = noteAttributes.altitude;
				note.author = noteAttributes.author;
				note.is_todo = noteAttributes['reminder-order'] !== '0' && !!noteAttributes['reminder-order'];
				note.todo_due = dateToTimestamp(noteAttributes['reminder-time'], true);
				note.todo_completed = dateToTimestamp(noteAttributes['reminder-done-time'], true);
				note.order = dateToTimestamp(noteAttributes['reminder-order'], true);
				note.source = noteAttributes.source ? `evernote.${noteAttributes.source}` : 'evernote';
				note.source_url = noteAttributes['source-url'] ? noteAttributes['source-url'] : '';

				noteAttributes = null;
			} else if (n == 'resource') {
				note.resources.push({
					id: noteResource.id,
					dataFilePath: noteResource.dataFilePath,
					dataEncoding: noteResource.dataEncoding,
					mime: noteResource.mime,
					title: noteResource.filename ? noteResource.filename : '',
					filename: noteResource.filename ? noteResource.filename : '',
				});

				noteResource = null;
			}
		});

		saxStream.on('end', function() {
			// Wait till there is no more notes to process.
			const iid = setInterval(() => {
				processNotes().then(allDone => {
					if (allDone) {
						clearTimeout(iid);
						resolve();
					}
				});
			}, 500);
		});

		stream.pipe(saxStream);
	});
}

module.exports = { importEnex };
