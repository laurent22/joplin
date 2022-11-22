import { mkdirp, readFile, writeFile } from 'fs-extra';
import { dirname } from 'path';
import applyTranslations from './applyTranslations';

export default async (englishFilePath: string, translatedFilePath: string, translations: Record<string, string>) => {
	const content = await readFile(englishFilePath, 'utf8');
	const translatedContent = await applyTranslations(content, translations);
	const translatedDirname = dirname(translatedFilePath);
	await mkdirp(translatedDirname);
	await writeFile(translatedFilePath, translatedContent, 'utf8');
};
