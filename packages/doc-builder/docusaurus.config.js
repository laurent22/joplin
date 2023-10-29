// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// To make their weird linter happy
process.env.WEBSITE_BASE_URL = process.env.WEBSITE_BASE_URL || '';

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'Joplin',
	tagline: 'Free your notes!',
	favicon: 'img/favicon.ico',

	// Set the production url of your site here
	url: process.env.WEBSITE_BASE_URL,
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	// organizationName: 'facebook', // Usually your GitHub org/user name.
	// projectName: 'docusaurus', // Usually your repo name.

	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internalization, you can use this field to set useful
	// metadata like html lang. For example, if your site is Chinese, you may want
	// to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

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
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl:
						'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
				},
				blog: {
					showReadingTime: true,
					blogSidebarCount: 'ALL',
					path: 'news',
					routeBasePath: 'news',
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl:
						'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
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
			// Replace with your project's social card
			image: 'img/docusaurus-social-card.jpg',
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
						type: 'docSidebar',
						sidebarId: 'helpSidebar',
						position: 'left',
						label: 'Help',
					},
					{
						to: '/news',
						label: 'News',
						position: 'left',
					},
					{
						to: process.env.WEBSITE_BASE_URL + '/plans',
						label: 'Joplin Cloud',
						position: 'right',
						className: 'navbar-custom-buttons plans-button',
					},
					{
						to: process.env.WEBSITE_BASE_URL + '/donate',
						label: '♡ Support us',
						position: 'right',
						className: 'navbar-custom-buttons sponsor-button',
					},
					// {
					// 	href: 'https://github.com/facebook/docusaurus',
					// 	label: 'GitHub',
					// 	position: 'right',
					// },
				],
			},
			footer: {
				style: 'dark',
				links: [
					// {
					// 	title: 'Docs',
					// 	items: [
					// 		{
					// 			label: 'Tutorial',
					// 			to: '/docs/intro',
					// 		},
					// 	],
					// },
					{
						title: 'Community',
						items: [
							{
								label: 'Stack Overflow',
								href: 'https://stackoverflow.com/questions/tagged/docusaurus',
							},
							{
								label: 'Discord',
								href: 'https://discordapp.com/invite/docusaurus',
							},
							{
								label: 'Twitter',
								href: 'https://twitter.com/docusaurus',
							},
						],
					},
					// {
					// 	title: 'More',
					// 	items: [
					// 		{
					// 			label: 'Blog',
					// 			to: '/blog',
					// 		},
					// 		{
					// 			label: 'GitHub',
					// 			href: 'https://github.com/facebook/docusaurus',
					// 		},
					// 	],
					// },
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
