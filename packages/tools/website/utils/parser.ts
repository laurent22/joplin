import { readFile } from 'fs-extra';
import { stripOffFrontMatter } from './frontMatter';

interface ReadmeDoc {
	title: string;
	body: string;
}

export async function readmeFileTitleAndBody(sourcePath: string): Promise<ReadmeDoc> {
	try {
		let md = await readFile(sourcePath, 'utf8');
		md = stripOffFrontMatter(md).doc.trim();
		const r = md.match(/^# (.*)/);

		if (!r) {
			throw new Error('Could not determine title');
		} else {
			const lines = md.split('\n');
			lines.splice(0, 1);
			return {
				title: r[1],
				body: lines.join('\n'),
			};
		}
	} catch (error) {
		error.message = `On ${sourcePath}: ${error.message}`;
		throw error;
	}
}

export async function readmeFileTitle(sourcePath: string) {
	const r = await readmeFileTitleAndBody(sourcePath);
	return r.title;
}

export function replaceGitHubByWebsiteLinks(md: string) {
	return md
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\/index\.md(#[^\s)]+|)/g, '/$1/$2')
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\.md(#[^\s)]+|)/g, '/$1/$2')
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/README\.md(#[^\s)]+|)/g, '/help/$1')
		.replace(/https:\/\/raw.githubusercontent.com\/laurent22\/joplin\/dev\/Assets\/WebsiteAssets\/(.*?)/g, '/$1');
}
