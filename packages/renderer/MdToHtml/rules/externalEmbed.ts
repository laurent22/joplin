import type * as MarkdownIt from 'markdown-it';

const extractVideoId = (url: string) => {
	const pattern = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
	const match = url.match(pattern);
	return match ? match[1] : null;
};

const plugin = (markdownIt: MarkdownIt) => {
	const defaultLinkOpenRender = markdownIt.renderer.rules.link_open || function(tokens, idx, options, env, self) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (self.renderToken as any)(tokens, idx, options, env, self);
	};

	const defaultTextRender = markdownIt.renderer.rules.text || function(tokens, idx) {
		return tokens[idx].content;
	};

	const defaultLinkCloseRender = markdownIt.renderer.rules.link_close || function(tokens, idx, options, env, self) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (self.renderToken as any)(tokens, idx, options, env, self);
	};

	let activeEmbedVideo: { videoId: string; originalUrl: string } | null = null;

	markdownIt.renderer.rules.link_open = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		const href = token.attrGet('href');

		if (href &&
			idx + 2 < tokens.length &&
			tokens[idx + 1].type === 'text' &&
			tokens[idx + 1].content === href &&
			tokens[idx + 2].type === 'link_close') {

			const videoId = extractVideoId(href);

			if (videoId) {
				let hasTextBefore = false;
				for (let i = idx - 1; i >= 0; i--) {
					const prevToken = tokens[i];
					if (prevToken.type === 'text' && prevToken.content.trim() !== '') {
						hasTextBefore = true;
						break;
					}
				}
				
				let hasTextAfter = false;
				for (let i = idx + 3; i < tokens.length; i++) {
					const nextToken = tokens[i];
					if (nextToken.type === 'text' && nextToken.content.trim() !== '') {
						hasTextAfter = true;
						break;
					}
				}
				
				if (!hasTextBefore && !hasTextAfter) {
					activeEmbedVideo = { videoId, originalUrl: href };
					return '';
				}
			}
		}

		return defaultLinkOpenRender(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.text = function(tokens, idx, options, env, self) {
		if (activeEmbedVideo) {
			return '';
		}
		return defaultTextRender(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.link_close = function(tokens, idx, options, env, self) {
		if (activeEmbedVideo) {
			const videoId = activeEmbedVideo.videoId;
			const originalUrl = activeEmbedVideo.originalUrl;
			activeEmbedVideo = null;

			const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
			const escapedUrl = markdownIt.utils.escapeHtml(originalUrl);

			return `
				<div class="joplin-editable">
					<span class="joplin-source" data-joplin-source-open="" data-joplin-source-close="">${escapedUrl}</span>
					<div class="joplin-youtube-player-rendered">
						<iframe src="${embedUrl}" title="YouTube video player" frameborder="0" allowfullscreen></iframe>
					</div>
				</div>
			`;
		}

		return defaultLinkCloseRender(tokens, idx, options, env, self);
	};
};

const assets = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				.joplin-youtube-player-rendered {
					width: 100%;
					max-width: 100%;
				}
				.joplin-youtube-player-rendered iframe {
					width: 100%;
					aspect-ratio: 16 / 9;
				}
			`,
		},
	].map(e => {
		return {
			source: 'youtube',
			...e,
		};
	});
};

export default {
	plugin,
	assets,
};
