require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

const fs = require('fs-extra');
const dirname = require('path').dirname;
const { fileExtension, basename } = require('lib/path-utils.js');
const markdownUtils = require('lib/markdownUtils.js');

const rootDir = dirname(__dirname);
const welcomeDir = `${rootDir}/readme/welcome`;

const createdDate = new Date('2018-06-22T12:00:00Z');

const itemMetadata_ = {
	'1_welcome_to_joplin.md': {
		id: '8a1556e382704160808e9a7bef7135d3',
		// tags: 'markdown,organising',
	},
	'2_importing_and_exporting_notes.md': {
		id: 'b863cbc514cb4cafbae8dd6a4fcad919',
		// tags: 'importing,exporting',
	},
	'3_synchronising_your_notes.md': {
		id: '25b656aac0564d1a91ab98295aa3cc58',
		// tags: 'synchronising',
	},
	'4_tips.md': {
		id: '2ee48f80889447429a3cccb04a466072',
		// tags: 'attachment,search',
	},
	'5_privacy.md': {
		id: '5ec2e7505ec2e7505ec2e7505ec2e750',
		// tags: 'privacy',
	},
	'AllClients.png': { id: '5c05172554194f95b60971f6d577cc1a' },
	'SubNotebooks.png': { id: '3a851ab0c0e849b7bc9e8cd5c4feb34a' },
	'folder_Welcome': { id: '9bb5d498aba74cc6a047cfdc841e82a1' },
	'WebClipper.png': { id: '30cf9214f5054c4da3b23eed7211a6e0' },

	'markdown': { id: '79cc5ef0f6c24f138033ce48928c2cba' },
	'organising': { id: 'c83be0495b5d4f1ab655c5c6dfed6804' },
	'importing': { id: 'b5adb734bb0044f2a572a729266b610d' },
	'exporting': { id: 'bed34e2e3ab74b45af8ba473a05f56f9' },
	'synchronising': { id: 'c442fa3b2b2b4389b160c15eb73f35c9' },
	'attachment': { id: '22c94167b6e94a92b560ffc31a7f4b1d' },
	'search': { id: '83eae47427df4805905103d4a91727b7' },
};

function itemMetadata(path) {
	const f = basename(path);
	const md = itemMetadata_[f];
	if (!md) throw new Error(`No metadata for: ${path}`);
	return md;
}

function noteTags(path) {
	const md = itemMetadata(path);
	if (!md.tags) return [];
	return md.tags.split(',');
}

function itemIdFromPath(path) {
	const md = itemMetadata(path);
	if (!md.id) throw new Error(`No ID for ${path}`);
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
	const title = `${number}. ${body.split('\n')[0].substr(2)}`;
	const resources = {};

	const imagePaths = markdownUtils.extractImageUrls(body);

	for (let i = 0; i < imagePaths.length; i++) {
		const imagePath = imagePaths[i];
		const fullImagePath = `${welcomeDir}/${imagePath}`;
		const base64 = fileToBase64(fullImagePath);

		resources[imagePath] = {
			id: itemIdFromPath(fullImagePath),
			body: base64,
		};
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
	const tagIdsToTag = {};
	const filenames = fs.readdirSync(welcomeDir);

	const rootFolder = {
		id: itemIdFromPath('folder_Welcome'),
		title: 'Welcome!',
	};

	for (let i = 0; i < filenames.length; i++) {
		const f = filenames[i];
		const ext = fileExtension(f);

		if (ext === 'md') {
			const note = await parseNoteFile(`${welcomeDir}/${f}`);
			note.parent_id = rootFolder.id;

			for (let j = 0; j < note.tags.length; j++) {
				const tagTitle = note.tags[j];
				const tagId = itemIdFromPath(tagTitle);
				if (!tagIdsToTag[tagId]) {
					tagIdsToTag[tagId] = {
						id: tagId,
						title: tagTitle,
					};
				}
			}

			notes.push(note);
		}
	}

	const tags = [];
	for (const n in tagIdsToTag) {
		if (!tagIdsToTag.hasOwnProperty(n)) continue;
		tags.push(tagIdsToTag[n]);
	}

	const folders = [];
	folders.push(rootFolder);

	const content = { notes: notes, folders: folders, tags: tags, timestamp: createdDate.getTime() };
	const jsonContent = JSON.stringify(content, null, 4);
	const jsContent = `module.exports = ${jsonContent}`;
	fs.writeFileSync(`${rootDir}/ReactNativeClient/lib/welcomeAssets.js`, jsContent, { encoding: 'utf8' });
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
