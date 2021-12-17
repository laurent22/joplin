// Fetch Patreon posts to Markdown so that we have them in a more versatile format
// and to add them to the "News" notifications later on.

const fetch = require('node-fetch');
const fs = require('fs-extra');
const { patreonOauthToken } = require('./tool-utils');
const HtmlToMd = require('@joplin/lib/HtmlToMd').default;
const { dirname, filename, basename } = require('@joplin/lib/path-utils');
const markdownUtils = require('@joplin/lib/markdownUtils').default;
const mimeUtils = require('@joplin/lib/mime-utils.js').mime;
const { mimeTypeFromHeaders } = require('@joplin/lib/net-utils');
const shim = require('@joplin/lib/shim').default;
const moment = require('moment');
const { pregQuote } = require('@joplin/lib/string-utils');
const { shimInit } = require('@joplin/lib/shim-init-node.js');

shimInit();

const rootDir = dirname(dirname(__dirname));
const blogDir = `${rootDir}/readme/news`;
const tempDir = `${__dirname}/temp`;
const imageDir = `${rootDir}/Assets/WebsiteAssets/images/news`;

const htmlToMd = new HtmlToMd();

async function fetchPosts(url) {
	const token = await patreonOauthToken();

	const response = await fetch(url, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
	});

	const responseJson = await response.json();

	const posts = responseJson.data.map(p => {
		return {
			id: p.id,
			title: p.attributes.title,
			content: p.attributes.content,
			published_at: p.attributes.published_at,
			url: p.attributes.url,
		};
	});

	return {
		data: posts,
		nextUrl: responseJson.links && responseJson.links.next ? responseJson.links.next : null,
	};
}

async function createPostFile(post, filePath) {
	let contentMd = htmlToMd.parse(post.content, { preserveImageTagsWithSize: true });

	const imageUrls = markdownUtils.extractImageUrls(contentMd);

	const imageUrlsToFiles = {};

	for (let i = 0; i < imageUrls.length; i++) {
		const imageUrl = imageUrls[i];
		const imageFilename = `${filename(filePath)}_${i}`;
		const imagePath = `${tempDir}/${imageFilename}`;

		let response = null;
		try {
			response = await shim.fetchBlob(imageUrl, { path: imagePath, maxRetry: 1 });
		} catch (error) {
			console.warn(`Could not fetch image: ${imageUrl}`);
			continue;
		}

		if (!response.ok) {
			console.warn(`Could not fetch image: ${imageUrl}`);
			continue;
		}

		const mimeType = mimeTypeFromHeaders(response.headers);
		let ext = 'jpg';
		if (mimeType) {
			const newExt = mimeUtils.toFileExtension(mimeType);
			if (newExt) ext = newExt;
		}

		const destFile = `${imageDir}/${imageFilename}.${ext}`;
		await fs.move(imagePath, destFile, { overwrite: true });

		imageUrlsToFiles[imageUrl] = destFile;
	}

	for (const imageUrl in imageUrlsToFiles) {
		const r = `https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/${basename(imageUrlsToFiles[imageUrl])}`;
		contentMd = contentMd.replace(new RegExp(pregQuote(imageUrl), 'g'), r);
	}

	const fileMd = [];
	fileMd.push('---');
	fileMd.push(`created: ${post.published_at}`);
	fileMd.push(`source_url: https://www.patreon.com${post.url}`);
	fileMd.push('---');
	fileMd.push('');
	fileMd.push(`# ${post.title}`);
	fileMd.push('');
	fileMd.push(contentMd);

	await fs.writeFile(filePath, fileMd.join('\n'));
}

async function createPostFiles(posts) {
	for (const post of posts) {
		const filename = `${moment(post.published_at).utc().format('YYYYMMDD-HHmmss')}.md`;
		await createPostFile(post, `${blogDir}/${filename}`);
	}
}

async function main() {
	await fs.mkdirp(blogDir);
	await fs.mkdirp(imageDir);
	await fs.mkdirp(tempDir);

	const fields = [
		'title',
		'content',
		'published_at',
		'url',
	];

	let url = `https://www.patreon.com/api/oauth2/v2/campaigns/1818121/posts?fields%5Bpost%5D=${fields.join(',')}`;

	while (url) {
		console.info('Fetching ', url);
		const result = await fetchPosts(url);
		console.info(`Found ${result.data.length} posts`);
		await createPostFiles(result.data);
		url = result.nextUrl;
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
}).then(() => {
	return fs.remove(tempDir);
});
