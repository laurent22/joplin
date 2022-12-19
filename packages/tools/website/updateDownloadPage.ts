import { readFile } from 'fs-extra';
import { rootDir, insertContentIntoFile } from '../tool-utils';

async function getReadmeMd() {
	return readFile(`${rootDir}/README.md`, 'utf8');
}

async function createDownloadButtonsHtml(readmeMd: string): Promise<Record<string, string>> {
	const output: Record<string, string> = {};
	output['windows'] = readmeMd.match(/(<a href=.*?Joplin-Setup-.*?<\/a>)/)[0];
	output['macOs'] = readmeMd.match(/(<a href=.*?Joplin-.*\.dmg.*?<\/a>)/)[0];
	output['linux'] = readmeMd.match(/(<a href=.*?Joplin-.*\.AppImage.*?<\/a>)/)[0];
	output['android'] = readmeMd.match(/(<a href='https:\/\/play.google.com\/store\/apps\/details\?id=net\.cozic\.joplin.*?<\/a>)/)[0];
	output['ios'] = readmeMd.match(/(<a href='https:\/\/itunes\.apple\.com\/us\/app\/joplin\/id1315599797.*?<\/a>)/)[0];

	for (const [k, v] of Object.entries(output)) {
		if (!v) throw new Error(`Could not get download element for: ${k}`);
	}

	return output;
}

export default async function updateDownloadPage(readmeMd: string = null) {
	readmeMd = readmeMd === null ? await getReadmeMd() : readmeMd;

	const downloadButtonsHtml = await createDownloadButtonsHtml(readmeMd);

	const desktopButtonsHtml = [
		downloadButtonsHtml['windows'],
		downloadButtonsHtml['macOs'],
		downloadButtonsHtml['linux'],
	];

	const mobileButtonsHtml = [
		downloadButtonsHtml['android'],
		downloadButtonsHtml['ios'],
	];

	await insertContentIntoFile(`${rootDir}/readme/download.md`, '<!-- DESKTOP-DOWNLOAD-LINKS -->', '<!-- DESKTOP-DOWNLOAD-LINKS -->', desktopButtonsHtml.join(' '));
	await insertContentIntoFile(`${rootDir}/readme/download.md`, '<!-- MOBILE-DOWNLOAD-LINKS -->', '<!-- MOBILE-DOWNLOAD-LINKS -->', mobileButtonsHtml.join(' '));
}
