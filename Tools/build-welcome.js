require('app-module-path').addPath(__dirname + '/../ReactNativeClient');

const fs = require('fs-extra');
const dirname = require('path').dirname;
const { fileExtension, basename } = require('lib/path-utils.js');
const markdownUtils = require('lib/markdownUtils.js');

const rootDir = dirname(__dirname);
const welcomeDir = rootDir + '/readme/welcome';

function itemIdFromPath(path) {
	const ids = {
		'1_welcome_to_joplin.md': '8a1556e382704160808e9a7bef7135d3',
		'2_importing_and_exporting_notes.md': 'b863cbc514cb4cafbae8dd6a4fcad919',
		'3_synchronising_your_notes.md': '25b656aac0564d1a91ab98295aa3cc58',
		'4_tips.md': '2ee48f80889447429a3cccb04a466072',
		'AllClients.png': '5c05172554194f95b60971f6d577cc1a',
		'folder_Welcome': '9bb5d498aba74cc6a047cfdc841e82a1',
	};

	const f = basename(path);
	const id = ids[f];
	if (!id) throw new Error('No ID for filename: ' + f);
	return id;
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
		resources: resources,
	};
}

async function main() {
	const notes = [];
	const filenames = fs.readdirSync(welcomeDir);

	const rootFolder = {
		id: itemIdFromPath('folder_Welcome'),
		title: 'Welcome',
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
});