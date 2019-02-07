require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const fs = require('fs-extra');
const dirname = require('path').dirname;
const { fileExtension, basename } = require('lib/path-utils.js');
const markdownUtils = require('lib/markdownUtils.js');

const rootDir = dirname(__dirname);
const welcomeDir = rootDir + '/readme/welcome';

const itemMetadata_ = {
	'1_welcome_to_joplin.md': {
		id: '8a1556e382704160808e9a7bef7135d3',
		tags: 'welcome,markdown,organizing',
	},
	'2_importing_and_exporting_notes.md': {
		id: 'b863cbc514cb4cafbae8dd6a4fcad919',
		tags: 'welcome,importing,exporting',
	},
	'3_synchronising_your_notes.md': {
		id: '25b656aac0564d1a91ab98295aa3cc58',
		tags: 'welcome,synchronizing',
	},
	'4_tips.md': {
		id: '2ee48f80889447429a3cccb04a466072',
		tags: 'welcome,attachment,search,alarm',
	},
	'AllClients.png': { id: '5c05172554194f95b60971f6d577cc1a' },
	'SubNotebooks.png': { id: '3a851ab0c0e849b7bc9e8cd5c4feb34a' },
	'folder_Welcome': { id: '9bb5d498aba74cc6a047cfdc841e82a1' },
	'WebClipper.png': { id: '30cf9214f5054c4da3b23eed7211a6e0' },
};

function itemMetadata(path) {
	const f = basename(path);
	const md = itemMetadata_[f];
	if (!md) throw new Error('No metadata for: ' + path);
	return md;
}

function noteTags(path) {
	const md = itemMetadata(path);
	if (!md.tags) throw new Error('No tags for: ' + path);
	return md.tags.split(',');
}

function itemIdFromPath(path) {
	const md = itemMetadata(path);
	if (!md.id) throw new Error('No ID for ' + path);
	return md.id;
}

function fileToBase64(filePath) {
	const content = fs.readFileSync(filePath);
	return Buffer.from(content).toString('base64');
}

async function parseNoteFile(filePath) {
	const n = basename(filePath);
	const number = n.split('_')[0];
	const body = fs.readFileSync(filePath, 'utf8');
	const title = number + '. ' + body.split('\n')[0].substr(2);
	const resources = {};

	const imagePaths = markdownUtils.extractImageUrls(body);

	for (let i = 0; i < imagePaths.length; i++) {
		const imagePath = imagePaths[i];
		const fullImagePath = welcomeDir + '/' + imagePath;
		const base64 = fileToBase64(fullImagePath);

		resources[imagePath] = {
			id: itemIdFromPath(fullImagePath),
			body: base64,
		}
	}

	return {
		id: itemIdFromPath(filePath),
		title: title,
		body: body,
		tags: noteTags(filePath),
		resources: resources,
	};
}

async function main() {
	const notes = [];
	const filenames = fs.readdirSync(welcomeDir);

	const rootFolder = {
		id: itemIdFromPath('folder_Welcome'),
		title: 'Welcome!',
	};
	
	for (let i = 0; i < filenames.length; i++) {
		const f = filenames[i];
		const ext = fileExtension(f);

		if (ext === 'md') {
			const note = await parseNoteFile(welcomeDir + '/' + f);
			note.parent_id = rootFolder.id;
			notes.push(note);
		}
	}

	const folders = [];
	folders.push(rootFolder);

	const content = { notes: notes, folders: folders }
	const jsonContent = JSON.stringify(content, null, 4);
	const jsContent = 'module.exports = ' + jsonContent;
	fs.writeFileSync(rootDir + '/ReactNativeClient/lib/welcomeAssets.js', jsContent, { encoding: 'utf8' });
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});