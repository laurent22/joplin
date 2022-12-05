// This script reads through the Markdown files in readme/news and post each of
// them as Dicourse forum posts. It then also update the news file with a link
// to that forum post.

import { readdir, readFile, writeFile } from 'fs-extra';
import { basename } from 'path';
import { rootDir } from '../tool-utils';
import fetch from 'node-fetch';
import { compileWithFrontMatter, MarkdownAndFrontMatter, stripOffFrontMatter } from './utils/frontMatter';
import { markdownToHtml } from './utils/render';
import { getNewsDate } from './utils/news';
const RSS = require('rss');

interface ApiConfig {
	baseUrl: string;
	key: string;
	username: string;
	newsCategoryId: number;
}

interface Post {
	id: string;
	path: string;
}

interface PostContent {
	title: string;
	body: string;
	parsed: MarkdownAndFrontMatter;
}

enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
	PUT = 'PUT',
	PATCH = 'PATCH',
}

interface ForumTopPost {
	id: number;
	raw: string;
	title: string;
}

const ignoredPostIds = ['20180621-172112','20180621-182112','20180906-101039','20180906-111039','20180916-200431','20180916-210431','20180929-111053','20180929-121053','20181004-081123','20181004-091123','20181101-174335','20181213-173459','20190130-230218','20190404-064157','20190404-074157','20190424-102410','20190424-112410','20190523-221026','20190523-231026','20190610-230711','20190611-000711','20190613-192613','20190613-202613','20190814-215957','20190814-225957','20190924-230254','20190925-000254','20190929-142834','20190929-152834','20191012-223121','20191012-233121','20191014-155136','20191014-165136','20191101-131852','20191117-183855','20191118-072700','20200220-190804','20200301-125055','20200314-001555','20200406-214254','20200406-224254','20200505-181736','20200606-151446','20200607-112720','20200613-103545','20200616-191918','20200620-114515','20200622-084127','20200626-134029','20200708-192444','20200906-172325','20200913-163730','20200915-091108','20201030-114530','20201126-114649','20201130-145937','20201212-172039','20201228-112150','20210104-131645','20210105-153008','20210130-144626','20210309-111950','20210310-100852','20210413-091132','20210430-083248','20210506-083359','20210513-095238','20210518-085514','20210621-104753','20210624-171844','20210705-094247','20210706-140228','20210711-095626','20210718-103538','20210729-103234','20210804-085003','20210831-154354','20210901-113415','20210929-144036','20210930-163458','20211031-115215','20211102-150403','20211217-120324','20220215-142000','20220224-release-2-7','20220308-gsoc2022-start','20220405-gsoc-contributor-proposals'];

const config: ApiConfig = {
	baseUrl: 'https://discourse.joplinapp.org',
	key: '',
	username: '',
	newsCategoryId: 9,
};

const getPosts = async (newsDir: string): Promise<Post[]> => {
	const filenames = await readdir(newsDir);
	const output: Post[] = [];

	for (const filename of filenames) {
		if (!filename.endsWith('.md')) continue;
		output.push({
			id: basename(filename, '.md'),
			path: `${newsDir}/${filename}`,
		});
	}

	output.sort((a: Post, b: Post) => {
		if (a.id < b.id) return -1;
		return +1;
	});

	return output;
};

const getPostContent = async (post: Post): Promise<PostContent> => {
	try {
		const raw = await readFile(post.path, 'utf8');
		const parsed = stripOffFrontMatter(raw);
		const lines = parsed.doc.split('\n');
		const titleLine = lines[0];
		if (!titleLine.startsWith('# ')) throw new Error('Cannot extract title from post: no header detected');
		lines.splice(0, 1);

		return {
			title: titleLine.substr(1).trim(),
			body: lines.join('\n').trim(),
			parsed,
		};
	} catch (error) {
		error.message = `Could not get post content: ${post.id}: ${post.path}: ${error.message}`;
		throw error;
	}
};

const execApi = async (method: HttpMethod, path: string, body: Record<string, string | number> = null) => {
	interface Request {
		method: HttpMethod;
		headers: Record<string, string>;
		body?: string;
	}

	const headers: Record<string, string> = {
		'Api-Key': config.key,
		'Api-Username': config.username,
	};

	if (method !== HttpMethod.GET) headers['Content-Type'] = 'application/json;';

	const request: Request = {
		method,
		headers,
	};

	if (body) request.body = JSON.stringify(body);

	const response = await fetch(`${config.baseUrl}/${path}`, request);

	if (!response.ok) {
		const errorText = await response.text();
		const error = new Error(`On ${method} ${path}: ${errorText}`);
		let apiObject = null;
		try {
			apiObject = JSON.parse(errorText);
		} catch (error) {
			// Ignore - it just means that the error object is a plain string
		}
		(error as any).apiObject = apiObject;
		throw error;
	}

	return response.json() as any;
};

const getForumTopPostByExternalId = async (externalId: string): Promise<ForumTopPost> => {
	try {
		const existingForumTopic = await execApi(HttpMethod.GET, `t/external_id/${externalId}.json`);
		const existingForumPost = await execApi(HttpMethod.GET, `posts/${existingForumTopic.post_stream.posts[0].id}.json`);
		return {
			id: existingForumPost.id,
			title: existingForumTopic.title,
			raw: existingForumPost.raw,
		};
	} catch (error) {
		if (error.apiObject && error.apiObject.error_type === 'not_found') return null;
		throw error;
	}
};

const generateRssFeed = async (posts: Post[]) => {
	let pubDate = null;
	let postCount = 0;
	const feedItems: any[] = [];
	for (const post of posts.reverse()) {
		const content = await getPostContent(post);
		const postDate = getNewsDate(content.parsed, post.path);
		const html = markdownToHtml(content.body);

		if (pubDate === null) pubDate = postDate;

		feedItems.push({
			title: content.title,
			description: html,
			url: `https://joplinapp.org/news/${post.id}/`,
			guid: post.id,
			date: postDate,
			custom_elements: [
				{ 'twitter-text': content.parsed.tweet },
			],
		});

		postCount++;
		if (postCount >= 20) break;
	}

	const feed = new RSS({
		title: 'Joplin',
		description: 'Joplin, the open source note-taking application',
		feed_url: 'https://joplinapp.org/rss.xml',
		site_url: 'https://joplinapp.org',
		pubDate,
	});

	for (const feedItem of feedItems) feed.item(feedItem);

	let xml = feed.xml() as string;

	// Change the build date otherwise it changes even when nothing has changed.
	// https://github.com/dylang/node-rss/pull/52
	xml = xml.replace(/<lastBuildDate>(.*?)<\/lastBuildDate>/, `<lastBuildDate>${pubDate.toUTCString()}</lastBuildDate>`);

	return xml;
};

const main = async () => {
	const argv = require('yargs').argv;
	config.key = argv._[0];
	config.username = argv._[1];

	if (!config.key || !config.username) throw new Error('API Key and Username are required');

	const posts = await getPosts(`${rootDir}/readme/news`);

	const rssFeed = await generateRssFeed(posts);
	await writeFile(`${rootDir}/Assets/WebsiteAssets/rss.xml`, rssFeed, 'utf8');

	for (const post of posts) {
		if (ignoredPostIds.includes(post.id)) continue;

		console.info(`Processing ${post.path}...`);

		try {
			const content = await getPostContent(post);
			const existingForumPost = await getForumTopPostByExternalId(post.id);

			if (existingForumPost) {
				// console.info('EXISTING ========================');
				// console.info(existingForumPost.title);
				// console.info(existingForumPost.raw);

				// console.info('NEW ========================');
				// console.info(content.title);
				// console.info(content.body);

				if (existingForumPost.title === content.title && existingForumPost.raw === content.body) {
					console.info('Post already exists and has not changed: skipping it...');
				} else {
					console.info('Post already exists and has changed: updating it...');

					await execApi(HttpMethod.PUT, `posts/${existingForumPost.id}.json`, {
						title: content.title,
						raw: content.body,
						edit_reason: 'Auto-updated by script',
					});
				}
			} else {
				console.info('Post does not exists: creating it...');

				const response = await execApi(HttpMethod.POST, 'posts', {
					title: content.title,
					raw: content.body,
					category: config.newsCategoryId,
					external_id: post.id,
				});

				const postUrl = `https://discourse.joplinapp.org/t/${response.topic_id}`;
				content.parsed.forum_url = postUrl;
				const compiled = compileWithFrontMatter(content.parsed);

				await writeFile(post.path, compiled, 'utf8');
			}
		} catch (error) {
			console.error(error);
		}
	}
};

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
