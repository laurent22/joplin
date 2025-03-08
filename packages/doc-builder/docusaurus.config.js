// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// To make their weird linter happy
process.env.WEBSITE_BASE_URL = process.env.WEBSITE_BASE_URL || '';

function rtrimSlashes(path) {
	return path.replace(/[\/\\]+$/, '');
}

function ltrimSlashes(path) {
	return path.replace(/^\/+/, '');
}

const explodePath = (path) => {
	return ltrimSlashes(rtrimSlashes(path)).split('/');
}

const createRedirect = (path) => {
	return path;
}

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'Joplin',
	tagline: 'Free your notes!',
	favicon: process.env.WEBSITE_BASE_URL + '/favicon.ico',

	// Set the production url of your site here
	url: process.env.WEBSITE_BASE_URL,
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',

	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internalization, you can use this field to set useful
	// metadata like html lang. For example, if your site is Chinese, you may want
	// to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr'],
	},

	plugins: [
		[
			require.resolve('docusaurus-lunr-search'),
			{},
		],
		[
			'@docusaurus/plugin-client-redirects',
			{
				createRedirects(existingPath) {
					try {
						const oldAppsPages = [
							'attachments',
							'clipper',
							'config_screen',
							'conflict',
							'custom_css',
							'debugging',
							'desktop',
							'email_to_note',
							'external_links',
							'external_text_editor',
							'import_export',
							'markdown',
							'mobile',
							'note_history',
							'notifications',
							'profiles',
							'publish_note',
							'rich_text_editor',
							'search',
							'share_notebook',
							'subnotebooks',
							'terminal',

							// Redirect disabled: This URL is now used for the plugin discovery
							// website. 
							// 'plugins',

						];

						for (const p of oldAppsPages) {
							if (existingPath.startsWith('/help/apps/' + p)) {
								return createRedirect('/' + p);
							}
						}

						const oldAboutPages = [
							'prereleases',
							'principles',
							'release_cycle',
							'stats',
						];

						for (const p of oldAboutPages) {
							if (existingPath.startsWith('/help/about/' + p)) {
								return createRedirect('/' + p);
							}
						}

						if (existingPath.startsWith('/help/dev/spec')) {
							const s = explodePath(existingPath);
							s.splice(0, 2);
							return createRedirect('/' + s.join('/'));
						}

						if (existingPath.startsWith('/help/api')) {
							const s = explodePath(existingPath);
							s.splice(0, 2);
							return createRedirect('/api/' + s.join('/'));
						}

						if (existingPath.startsWith('/help/about/changelog/')) {
							const s = explodePath(existingPath);
							const last = s.pop();
							if (last === 'desktop') {
								return createRedirect('/changelog');
							} else {
								return createRedirect('/changelog_' + last);
							}
						}

						if (existingPath === '/help/faq') {
							return createRedirect('/faq');
						}

						if (existingPath === '/help/apps/sync/e2ee') {
							return createRedirect('/e2ee');
						}

						if (existingPath === '/help/api') {
							return createRedirect('/api/overview');
						}
					} catch (error) {
						console.error('For existingPath = ', existingPath);
						throw error;
					}

					return undefined;
				},
			},
		],
	],

	markdown: {
		mermaid: true,
	},
	themes: ['@docusaurus/theme-mermaid'],

	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					path: 'help',
					routeBasePath: 'help',
					sidebarPath: require.resolve('./sidebars.js'),
					breadcrumbs: false,
					editUrl: (params) => {
						return 'https://github.com/laurent22/joplin/tree/dev/readme/' + params.docPath;
					},
				},
				blog: {
					blogTitle: 'News',
					showReadingTime: true,
					blogSidebarCount: 'ALL',
					path: 'news',
					routeBasePath: 'news',
					editUrl: (params) => {
						return 'https://github.com/laurent22/joplin/tree/dev/readme/news/' + params.blogPath;
					},
				},
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
				sitemap: {
					changefreq: 'weekly',
					priority: 0.5,
					filename: 'sitemap.xml',
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: '',
				logo: {
					alt: 'Joplin',
					src: 'images/logo-text-blue.svg',
					href: process.env.WEBSITE_BASE_URL,
					target: '_self',
				},
				items: [
					{
						to: '/news',
						label: 'News',
						position: 'right',
					},
					{
						type: 'docSidebar',
						sidebarId: 'helpSidebar',
						position: 'right',
						label: 'Help',
					},
					{
						to: 'https://discourse.joplinapp.org',
						label: 'Forum',
						position: 'right',
					},
					{
						to: process.env.WEBSITE_BASE_URL + '/plans',
						label: 'Joplin Cloud',
						position: 'right',
						className: 'navbar-custom-buttons plans-button',
						target: '_self',
					},
					{
						to: process.env.WEBSITE_BASE_URL + '/donate',
						label: '♡ Support us',
						position: 'right',
						className: 'navbar-custom-buttons sponsor-button',
						target: '_self',
					},
					{
						type: 'localeDropdown',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'dark',
				links: [
					{
						title: 'Community',
						items: [
							{
								label: 'Bluesky',
								href: 'https://bsky.app/profile/joplinapp.bsky.social',
							},
							{
								label: 'Patreon',
								href: 'https://www.patreon.com/joplin',
							},
							{
								label: 'LinkedIn',
								href: 'https://www.linkedin.com/company/joplin',
							},
							{
								label: 'Discord',
								href: 'https://discord.gg/VSj7AFHvpq',
							},
							{
								label: 'Mastodon',
								href: 'https://mastodon.social/@joplinapp',
							},
							{
								label: 'Lemmy',
								href: 'https://sopuli.xyz/c/joplinapp',
							},
							{
								label: 'GitHub',
								href: 'https://github.com/laurent22/joplin/',
							},
						],
					},
					{
						title: 'Legal',
						items: [
							{
								label: 'Privacy Policy',
								to: process.env.WEBSITE_BASE_URL + '/privacy',
							},
						],
					},
				],
				copyright: `Copyright © 2016-${new Date().getFullYear()} Laurent Cozic`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
		}),
};

module.exports = config;
