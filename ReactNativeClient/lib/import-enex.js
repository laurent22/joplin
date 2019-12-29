const { uuid } = require('lib/uuid.js');
const moment = require('moment');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const Resource = require('lib/models/Resource.js');
const { MarkupToHtml } = require('joplin-renderer');
const { enexXmlToMd } = require('./import-enex-md-gen.js');
const { enexXmlToHtml } = require('./import-enex-html-gen.js');
const { time } = require('lib/time-utils.js');
const Levenshtein = require('levenshtein');
const md5 = require('md5');

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

async function filePutContents(filePath, content) {
	await fs.writeFile(filePath, content);
}

function removeUndefinedProperties(note) {
	let output = {};
	for (let n in note) {
		if (!note.hasOwnProperty(n)) continue;
		let v = note[n];
		if (v === undefined || v === null) continue;
		output[n] = v;
	}
	return output;
}

function levenshteinPercent(s1, s2) {
	let l = new Levenshtein(s1, s2);
	if (!s1.length || !s2.length) return 1;
	return Math.abs(l.distance / s1.length);
}

async function fuzzyMatch(note) {
	if (note.created_time < time.unixMs() - 1000 * 60 * 60 * 24 * 360) {
		let notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0 AND created_time = ? AND title = ?', [note.created_time, note.title]);
		return notes.length !== 1 ? null : notes[0];
	}

	let notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0 AND created_time = ?', [note.created_time]);
	if (notes.length === 0) return null;
	if (notes.length === 1) return notes[0];

	let lowestL = 1;
	let lowestN = null;
	for (let i = 0; i < notes.length; i++) {
		let n = notes[i];
		let l = levenshteinPercent(note.title, n.title);
		if (l < lowestL) {
			lowestL = l;
			lowestN = n;
		}
	}

	if (lowestN && lowestL < 0.2) return lowestN;

	return null;
}

async function saveNoteResources(note) {
	let resourcesCreated = 0;
	for (let i = 0; i < note.resources.length; i++) {
		let resource = note.resources[i];
		if (!resource.id) continue;

		let toSave = Object.assign({}, resource);
		delete toSave.data;

		// The same resource sometimes appear twice in the same enex (exact same ID and file).
		// In that case, just skip it - it means two different notes might be linked to the
		// same resource.
		let existingResource = await Resource.load(toSave.id);
		if (existingResource) continue;

		await filePutContents(Resource.fullPath(toSave), resource.data);
		await Resource.save(toSave, { isNew: true });
		resourcesCreated++;
	}
	return resourcesCreated;
}

async function saveNoteTags(note) {
	let notesTagged = 0;
	for (let i = 0; i < note.tags.length; i++) {
		let tagTitle = note.tags[i];

		let tag = await Tag.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.save({ title: tagTitle });

		await Tag.addNote(tag.id, note.id);

		notesTagged++;
	}
	return notesTagged;
}

async function saveNoteToStorage(note, fuzzyMatching = false) {
	note = Note.filter(note);

	let existingNote = fuzzyMatching ? await fuzzyMatch(note) : null;

	let result = {
		noteCreated: false,
		noteUpdated: false,
		noteSkipped: false,
		resourcesCreated: 0,
		notesTagged: 0,
	};

	let resourcesCreated = await saveNoteResources(note);
	result.resourcesCreated += resourcesCreated;

	let notesTagged = await saveNoteTags(note);
	result.notesTagged += notesTagged;

	if (existingNote) {
		let diff = BaseModel.diffObjects(existingNote, note);
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
		let progressState = {
			loaded: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			resourcesCreated: 0,
			notesTagged: 0,
		};

		let stream = fs.createReadStream(filePath);

		let options = {};
		let strict = true;
		let saxStream = require('sax').createStream(strict, options);

		let nodes = []; // LIFO list of nodes so that we know in which node we are in the onText event
		let note = null;
		let noteAttributes = null;
		let noteResource = null;
		let noteResourceAttributes = null;
		let noteResourceRecognition = null;
		let notes = [];
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
					let note = notes.shift();
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

					const result = await saveNoteToStorage(note, importOptions.fuzzyMatching);

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
			let n = currentNodeName();

			if (noteAttributes) {
				noteAttributes[n] = text;
			} else if (noteResourceAttributes) {
				noteResourceAttributes[n] = text;
			} else if (noteResource) {
				if (n == 'data') {
					let attr = currentNodeAttributes();
					noteResource.dataEncoding = attr.encoding;
				}
				if (!(n in noteResource)) noteResource[n] = '';
				noteResource[n] += text;
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
			let n = node.name.toLowerCase();
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
			let n = currentNodeName();

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

		saxStream.on('closetag', function(n) {
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

				// if (noteAttributes['reminder-time']) {
				// 	console.info('======================================================');
				// 	console.info(noteAttributes);
				// 	console.info('------------------------------------------------------');
				// 	console.info(note);
				// 	console.info('======================================================');
				// }

				noteAttributes = null;
			} else if (n == 'resource') {
				let decodedData = null;
				let resourceId = noteResource.id;
				if (noteResource.dataEncoding == 'base64') {
					try {
						decodedData = Buffer.from(noteResource.data, 'base64');
					} catch (error) {
						importOptions.onError(error);
					}
				} else if (noteResource.dataEncoding) {
					importOptions.onError(new Error(`Cannot decode resource with encoding: ${noteResource.dataEncoding}`));
					decodedData = noteResource.data; // Just put the encoded data directly in the file so it can, potentially, be manually decoded later
				}

				if (!resourceId && decodedData) {
					// If no resource ID is present, the resource ID is actually the MD5 of the data.
					// This ID will match the "hash" attribute of the corresponding <en-media> tag.
					resourceId = md5(decodedData);
				}

				if (!resourceId || !noteResource.data) {
					const debugTemp = Object.assign({}, noteResource);
					debugTemp.data = debugTemp.data ? `${debugTemp.data.substr(0, 32)}...` : debugTemp.data;
					importOptions.onError(new Error(`This resource was not added because it has no ID or no content: ${JSON.stringify(debugTemp)}`));
				} else {
					let size = 0;
					if (decodedData) {
						size = 'byteLength' in decodedData ? decodedData.byteLength : decodedData.length;
					}

					let r = {
						id: resourceId,
						data: decodedData,
						mime: noteResource.mime,
						title: noteResource.filename ? noteResource.filename : '',
						filename: noteResource.filename ? noteResource.filename : '',
						size: size,
					};

					note.resources.push(r);
				}

				noteResource = null;
			}
		});

		saxStream.on('end', function() {
			// Wait till there is no more notes to process.
			let iid = setInterval(() => {
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
