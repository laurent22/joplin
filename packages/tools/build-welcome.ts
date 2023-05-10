import { readFileSync, readdirSync, writeFileSync } from 'fs-extra';
import { dirname } from 'path';
import { fileExtension, basename } from '@joplin/lib/path-utils';
import markdownUtils from '@joplin/lib/markdownUtils';
import { AssetContent, ItemMetadata, WelcomeAssetNote, WelcomeAssetResource, WelcomeAssets } from '@joplin/lib/WelcomeUtils';

const rootDir = dirname(dirname(__dirname));
const enWelcomeDir = `${rootDir}/readme/welcome`;

const createdDate = new Date('2018-06-22T12:00:00Z');

const itemMetadata_: ItemMetadata = {
	'1_welcome_to_joplin.md': {
		id: '8a1556e382704160808e9a7bef7135d3',
	},
	'2_importing_and_exporting_notes.md': {
		id: 'b863cbc514cb4cafbae8dd6a4fcad919',
	},
	'3_synchronising_your_notes.md': {
		id: '25b656aac0564d1a91ab98295aa3cc58',
	},
	'4_tips.md': {
		id: '2ee48f80889447429a3cccb04a466072',
	},
	'5_privacy.md': {
		id: '5ec2e7505ec2e7505ec2e7505ec2e750',
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

const allMetadata_: Record<string, ItemMetadata> = {};

allMetadata_['en_GB'] = itemMetadata_;

allMetadata_['fr_FR'] = {
	...itemMetadata_,
	'1_welcome_to_joplin.md': {
		id: '223a99e0dad4c8882988f446815ea28c',
	},
	'2_importing_and_exporting_notes.md': {
		id: '21648b1b1b541e7bb87cff262bcc6b54',
	},
	'3_synchronising_your_notes.md': {
		id: '3adfa574c0264f68f4c33c4133e734fb',
	},
	'4_tips.md': {
		id: '4d0ffc5beb024e6c498129ad814d156e',
	},
	'5_privacy.md': {
		id: '69f9b160ddb50a954157716e3d916c68',
	},
	'folder_Welcome': { id: '5494e8c3dcfc84c1549ed22fb3a89265' },
};

const getWelcomeDir = (locale: string) => {
	if (locale === 'en_GB') return enWelcomeDir;
	return `${rootDir}/readme/_i18n/${locale}/welcome`;
};

function itemMetadata(metadata: ItemMetadata, path: string) {
	const f = basename(path);
	const md = metadata[f];
	if (!md) throw new Error(`No metadata for: ${path}`);
	return md;
}

function itemIdFromPath(metadata: ItemMetadata, path: string) {
	const md = itemMetadata(metadata, path);
	if (!md.id) throw new Error(`No ID for ${path}`);
	return md.id;
}

function fileToBase64(filePath: string) {
	const content = readFileSync(filePath);
	return Buffer.from(content).toString('base64');
}

function parseNoteFile(metadata: ItemMetadata, locale: string, filePath: string): WelcomeAssetNote {
	const n = basename(filePath);
	const number = n.split('_')[0];
	const body = readFileSync(filePath, 'utf8');
	const title = `${number}. ${body.split('\n')[0].substr(2)}`;
	const resources: Record<string, WelcomeAssetResource> = {};

	if (locale === 'en_GB') {
		const imagePaths = markdownUtils.extractImageUrls(body);

		for (let i = 0; i < imagePaths.length; i++) {
			const imagePath = imagePaths[i];
			const fullImagePath = `${enWelcomeDir}/${imagePath}`;
			const base64 = fileToBase64(fullImagePath);

			resources[imagePath] = {
				id: itemIdFromPath(metadata, fullImagePath),
				body: base64,
			};
		}
	}

	return {
		id: itemIdFromPath(metadata, filePath),
		title: title,
		body: body,
		resources: resources,
		parent_id: '',
	};
}

async function main() {
	const supportedLocales = ['en_GB', 'fr_FR'];
	const allContent: WelcomeAssets = {};

	for (const locale of supportedLocales) {
		const metadata = allMetadata_[locale];
		const welcomeDir = getWelcomeDir(locale);

		const notes = [];
		const filenames = readdirSync(welcomeDir);

		const rootFolder = {
			id: itemIdFromPath(metadata, 'folder_Welcome'),
			title: '',
		};

		for (let i = 0; i < filenames.length; i++) {
			const f = filenames[i];
			const ext = fileExtension(f);

			if (ext === 'md') {
				const note = await parseNoteFile(metadata, locale, `${welcomeDir}/${f}`);
				note.parent_id = rootFolder.id;
				notes.push(note);
			}
		}

		const folders = [];
		folders.push(rootFolder);

		const content: AssetContent = { notes: notes, folders: folders, timestamp: createdDate.getTime() };
		allContent[locale] = content;
	}

	const jsonContent = JSON.stringify(allContent, null, 4);
	const jsContent = `module.exports = ${jsonContent}`;
	writeFileSync(`${rootDir}/packages/lib/welcomeAssets.js`, jsContent, { encoding: 'utf8' });
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
