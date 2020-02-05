const fs = require('fs-extra');
const dirname = require('path').dirname;
const Mustache = require('mustache');

const headerHtml = `<!doctype html>
<html>

<!--

!!! WARNING !!!

This file was auto-generated from {{{sourceMarkdownFile}}} and any manual change
made to it will be overwritten. To make a change to this file please modify
the source Markdown file:

https://github.com/laurent22/joplin/blob/master/{{{sourceMarkdownFile}}}

-->

<head>
	<title>{{pageTitle}}</title>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="https://joplinapp.org/css/bootstrap.min.css">
	<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
	<!-- <link rel="stylesheet" href="https://joplinapp.org/css/fontawesome-all.min.css">  -->
	<link rel="stylesheet" href="https://joplinapp.org/css/fork-awesome.min.css"> 
	<script src="https://joplinapp.org/js/jquery-3.2.1.slim.min.js"></script>
	<style>
	body {
		background-color: #F1F1F1;
		color: #333333;
	}
	table {
		margin-bottom: 1em;
	}
	td, th {
		padding: .8em;
		border: 1px solid #ccc;
	}

	.page-markdown table pre,
	.page-markdown table blockquote {
		margin-bottom: 0;
	}

	.page-markdown table pre,
	.page-markdown table blockquote {
		margin-bottom: 0;
	}

	.page-markdown table pre {
		background-color: rgba(0,0,0,0);
		border: none;
		margin: 0;
		padding: 0;
	}

	h1, h2 {
		border-bottom: 1px solid #eaecef;
		padding-bottom: 0.3em;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
		font-weight: 600;
		font-size: 2em;
		margin-bottom: 16px;
	}
	h2 {
		font-size: 1.6em;
	}
	h3 {
		font-size: 1.3em;
	}
	code {
		color: black;
		background-color: #eee;
		border: 1px solid #ccc;
		font-size: .85em;
	}
	pre code {
		border: none;
	}
	pre {
		font-size: .85em;
	}
	blockquote {
		font-size: 1em;
		color: #555;
	};
	#toc ul {
		margin-bottom: 10px;
	}
	#toc {
		padding-bottom: 1em;
	}
	.title {
		display: flex;
		align-items: center;
	}
	.title-icon {
		display: flex;
		height: 1em;
	}
	.title-text {
		display: flex;
		font-weight: normal;
		margin-bottom: .2em;
		margin-left: .5em;
	}
	.sub-title {
		font-weight: normal;
	}
	.container {
		background-color: white;
		padding: 0;
		box-shadow: 0 10px 20px #888888;
	}
	table.screenshots {
		margin-top: 2em;
		margin-bottom: 2em;
	}
	table.screenshots th {
		height: 3em;
		text-align: center;
	}
	table.screenshots th, 
	table.screenshots td {
		border: 1px solid #C2C2C2;
	}
	img[align="left"] {
		margin-right: 10px;
		margin-bottom: 10px;
	}
	.mobile-screenshot {
		height: 40em;
		padding: 1em;
	}
	.cli-screenshot-wrapper {
		background-color: black;
		vertical-align: top;
		padding: 1em 2em 1em 1em;
	}
	.cli-screenshot {
		font-family: "Monaco", "Inconsolata", "CONSOLAS", "Deja Vu Sans Mono", "Droid Sans Mono", "Andale Mono", monospace;
		background-color: black;
		color: white;
		border: none;
	}
	.cli-screenshot .prompt {
		color: #48C2F0;
	}
	.top-screenshot {
		margin-top: 2em;
		text-align: center;
	}
	.header {
		position: relative;
		padding-left: 2em;
		padding-right: 2em;
		padding-top: 1em;
		padding-bottom: 1em;
		color: white;
		background-color: #2B2B3D;
	}
	.header a h1 {
		color: white;
	}
	.header a:hover {
		text-decoration: none;
	}
	.content {
		padding-left: 2em;
		padding-right: 2em;
		padding-bottom: 2em;
		padding-top: 2em;
	}
	.forkme {
		position: absolute;
		right: 0;
		top:0;
	}
	.nav-wrapper {
		position: relative;
		width: inherit;
	}
	.nav {
		background-color: black;
		display: table;
		width: inherit;
	}
	.nav.sticky {
		position:fixed;
		top: 0;
		width: inherit;
		box-shadow: 0 0 10px #000000;
	}
	.nav a {
		color: white;
		display: inline-block;
		padding: .6em .9em .6em .9em;
	}
	.nav ul {
		padding-left: 2em;
		margin-bottom: 0;
		display: table-cell;
		/* min-width: 250px; */
		/* For GSoC: */
		min-width: 470px;
	}
	.nav ul li {
		display: inline-block;
		padding: 0;
	}
	.nav li.selected {
		background-color: #222;
		font-weight: bold;
	}
	.nav-right {
		display: table-cell;
		width: 100%;
		text-align: right;
		vertical-align: middle;
		line-height: 0;
	}
	.nav-right .share-btn {
		display: none;
	}
	.nav-right .small-share-btn {
		display: none;
	}
	.footer {
		padding-top: 1em;
		border-top: 1px solid #d4d4d4;
		margin-top: 2em;
		color: gray;
		font-size: .9em;
	}
	a.heading-anchor {
		display: inline-block;
		opacity: 0;
		width: 1.3em;
		font-size: 0.7em;
		margin-left: 0.4em;
		line-height: 1em;
		text-decoration: none;
		transition: opacity 0.3s;
	}
	a.heading-anchor:hover,
	h1:hover a.heading-anchor,
	h2:hover a.heading-anchor,
	h3:hover a.heading-anchor,
	h4:hover a.heading-anchor,
	h5:hover a.heading-anchor,
	h6:hover a.heading-anchor {
		opacity: 1;
	}

	.bottom-links {
		display: flex;
		justify-content: center;
		border-top: 1px solid #d4d4d4;
		margin-top: 30px;
		padding-top: 25px;
	}

	@media all and (min-width: 400px) {
		.nav-right .share-btn {
			display: inline-block;
		}
		.nav-right .small-share-btn {
			display: none;
		}
	}
</style>
</head>

<body>

<div class="container page-{{sourceMarkdownName}}">

<div class="header">
	<a class="forkme" href="https://github.com/laurent22/joplin"><img src="{{{imageBaseUrl}}}/ForkMe.png"/></a>
	<a href="https://joplinapp.org"><h1 class="title"><img class="title-icon" src="{{{imageBaseUrl}}}/Icon512.png"><span class="title-text">Joplin</span></h1></a>
	<p class="sub-title">An open source note taking and to-do application with synchronisation capabilities</p>
</div>

<div class="nav-wrapper">
	<div class="nav">
		<ul>
			<li class="{{selectedHome}}"><a href="{{baseUrl}}/" title="Home"><i class="fa fa-home"></i></a></li>
			<li><a href="https://discourse.joplinapp.org" title="Forum">Forum</a></li>
			<li><a class="help" href="#" title="Menu">Menu</a></li>
			<li><a class="gsoc" href="https://joplinapp.org/gsoc2020/" title="Google Summer of Code 2020">GSoC 2020</a></li>
		</ul>
		<div class="nav-right">
			<!--
				<iframe class="share-btn" src="https://www.facebook.com/plugins/share_button.php?href=http%3A%2F%2Fjoplinapp.org&layout=button&size=small&mobile_iframe=true&width=60&height=20&appId" width="60" height="20" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowTransparency="true"></iframe>
				<iframe class="share-btn" src="https://platform.twitter.com/widgets/tweet_button.html?url=http%3A%2F%2Fjoplinapp.org" width="62" height="20" title="Tweet" style="border: 0; overflow: hidden;"></iframe>
			-->
			<iframe class="share-btn share-btn-github" src="https://ghbtns.com/github-btn.html?user=laurent22&repo=joplin&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
		</div>
	</div>
</div>

<div class="content">
	{{{tocHtml}}}
`;

const footerHtmlTemplate = `
<div class="footer">
Copyright (c) 2016-YYYY Laurent Cozic
</div>
</body>
</html>
`;

const footerHtml = footerHtmlTemplate.replace('YYYY', new Date().getFullYear());

// const screenshotHtml = `
// <table class="screenshots">
// 	<tr>
// 		<th>
// 			Mobile
// 		</th>
// 		<th>
// 			Command line
// 		</th>
// 	</tr>
// 	<tr>
// 		<td>
// 			<img class="mobile-screenshot" src="docs/images/Mobile.png"/>
// 		</td>
// 		<td class="cli-screenshot-wrapper">
// 			<pre class="cli-screenshot">
// <span class="prompt">joplin:/My notebook$</span> ls -n 12
// [ ] 8am conference call ☎
// [ ] Make vet appointment
// [ ] Go pick up parcel
// [ ] Pay flat rent 💸
// [X] Book ferry 🚢
// [X] Deploy Joplin app
//     Open source stuff
//     Swimming pool time table 🏊
//     Grocery shopping list 📝
//     Work itinerary
//     Tuesday random note
//     Vacation plans ☀
// 			</pre>
// 		</td>
// 	</tr>
// </table>
// `;

const scriptHtml = `
<script>
	function stickyHeader() { 
		return; // Disabled

		if ($(window).scrollTop() > 179) {
			$('.nav').addClass('sticky'); 
		} else {
			$('.nav').removeClass('sticky');
		}
	}

	$('#toc').hide();

	$('.help').click(function(event) {
		event.preventDefault();
		$('#toc').show();
	});

	$(window).scroll(function() {
		stickyHeader();
	});

	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
	ga('create', 'UA-103586105-1', 'auto');
	ga('send', 'pageview');
</script>
`;

const rootDir = dirname(__dirname);

function markdownToHtml(md, templateParams) {
	const MarkdownIt = require('markdown-it');

	const markdownIt = new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});

	markdownIt.core.ruler.push('checkbox', state => {
		const tokens = state.tokens;
		const Token = state.Token;
		const doneNames = [];

		const headingTextToAnchorName = (text, doneNames) => {
			const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let lastWasDash = true;
			let output = '';
			for (let i = 0; i < text.length; i++) {
				const c = text[i];
				if (allowed.indexOf(c) < 0) {
					if (lastWasDash) continue;
					lastWasDash = true;
					output += '-';
				} else {
					lastWasDash = false;
					output += c;
				}
			}

			output = output.toLowerCase();

			while (output.length && output[output.length - 1] === '-') {
				output = output.substr(0, output.length - 1);
			}

			let temp = output;
			let index = 1;
			while (doneNames.indexOf(temp) >= 0) {
				temp = `${output}-${index}`;
				index++;
			}
			output = temp;

			return output;
		};

		const createAnchorTokens = anchorName => {
			const output = [];

			{
				const token = new Token('heading_anchor_open', 'a', 1);
				token.attrs = [
					['name', anchorName],
					['href', `#${anchorName}`],
					['class', 'heading-anchor'],
				];
				output.push(token);
			}

			{
				const token = new Token('text', '', 0);
				token.content = '🔗';
				output.push(token);
			}

			{
				const token = new Token('heading_anchor_close', 'a', -1);
				output.push(token);
			}

			return output;
		};

		let insideHeading = false;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'heading_open') {
				insideHeading = true;
				continue;
			}

			if (token.type === 'heading_close') {
				insideHeading = false;
				continue;
			}

			if (insideHeading && token.type === 'inline') {
				const anchorName = headingTextToAnchorName(token.content, doneNames);
				doneNames.push(anchorName);
				const anchorTokens = createAnchorTokens(anchorName);
				// token.children = anchorTokens.concat(token.children);
				token.children = token.children.concat(anchorTokens);
			}
		}
	});

	const improveDocHtml = `
		<div class="bottom-links">
			<a href="https://github.com/laurent22/joplin/blob/master/{{{sourceMarkdownFile}}}">
				<i class="fa fa-github"></i> Improve this doc
			</a>
		</div>`;

	return Mustache.render(headerHtml, templateParams) + markdownIt.render(md) + Mustache.render(improveDocHtml, templateParams) + scriptHtml + footerHtml;
}

let tocMd_ = null;
let tocHtml_ = null;
const tocRegex_ = /<!-- TOC -->([^]*)<!-- TOC -->/;
function tocMd() {
	if (tocMd_) return tocMd_;
	const md = fs.readFileSync(`${rootDir}/README.md`, 'utf8');
	const toc = md.match(tocRegex_);
	tocMd_ = toc[1];
	return tocMd_;
}

function replaceGitHubByJoplinAppLinks(md) {
	return md.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/master\/readme\/(.*)\.md(#[^\s)]+|)/g, 'https://joplinapp.org/$1/$2');
}

function tocHtml() {
	if (tocHtml_) return tocHtml_;
	const MarkdownIt = require('markdown-it');
	const markdownIt = new MarkdownIt();
	let md = tocMd();
	md = md.replace(/# Table of contents/, '');
	md = replaceGitHubByJoplinAppLinks(md);
	tocHtml_ = markdownIt.render(md);
	tocHtml_ = `<div id="toc">${tocHtml_}</div>`;
	return tocHtml_;
}

function renderMdToHtml(md, targetPath, templateParams) {
	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin\n/, '');

	templateParams.baseUrl = 'https://joplinapp.org';
	templateParams.imageBaseUrl = `${templateParams.baseUrl}/images`;
	templateParams.tocHtml = tocHtml();

	const title = [];

	if (!templateParams.title) {
		title.push('Joplin - an open source note taking and to-do application with synchronisation capabilities');
	} else {
		title.push(templateParams.title);
		title.push('Joplin');
	}

	md = replaceGitHubByJoplinAppLinks(md);

	templateParams.pageTitle = title.join(' | ');
	const html = markdownToHtml(md, templateParams);
	fs.writeFileSync(targetPath, html);
}

function renderFileToHtml(sourcePath, targetPath, templateParams) {
	const md = fs.readFileSync(sourcePath, 'utf8');
	return renderMdToHtml(md, targetPath, templateParams);
}

function makeHomePageMd() {
	let md = fs.readFileSync(`${rootDir}/README.md`, 'utf8');
	md = md.replace(tocRegex_, '');

	// HACK: GitHub needs the \| or the inline code won't be displayed correctly inside the table,
	// while MarkdownIt doesn't and will in fact display the \. So we remove it here.
	md = md.replace(/\\\| bash/g, '| bash');

	return md;
}

async function main() {
	tocMd();

	renderMdToHtml(makeHomePageMd(), `${rootDir}/docs/index.html`, { sourceMarkdownFile: 'README.md' });

	const sources = [
		['readme/changelog.md', 'docs/changelog/index.html', { title: 'Changelog (Desktop App)' }],
		['readme/changelog_cli.md', 'docs/changelog_cli/index.html', { title: 'Changelog (CLI App)' }],
		['readme/clipper.md', 'docs/clipper/index.html', { title: 'Web Clipper' }],
		['readme/debugging.md', 'docs/debugging/index.html', { title: 'Debugging' }],
		['readme/desktop.md', 'docs/desktop/index.html', { title: 'Desktop Application' }],
		['readme/donate.md', 'docs/donate/index.html', { title: 'Donate' }],
		['readme/e2ee.md', 'docs/e2ee/index.html', { title: 'End-To-End Encryption' }],
		['readme/faq.md', 'docs/faq/index.html', { title: 'FAQ' }],
		['readme/mobile.md', 'docs/mobile/index.html', { title: 'Mobile Application' }],
		['readme/spec.md', 'docs/spec/index.html', { title: 'Specifications' }],
		['readme/stats.md', 'docs/stats/index.html', { title: 'Statistics' }],
		['readme/terminal.md', 'docs/terminal/index.html', { title: 'Terminal Application' }],
		['readme/api.md', 'docs/api/index.html', { title: 'REST API' }],
		['readme/prereleases.md', 'docs/prereleases/index.html', { title: 'Pre-releases' }],
		['readme/markdown.md', 'docs/markdown/index.html', { title: 'Markdown Guide' }],
		['readme/nextcloud_app.md', 'docs/nextcloud_app/index.html', { title: 'Joplin Web API for Nextcloud' }],

		['readme/gsoc2020/index.md', 'docs/gsoc2020/index.html', { title: 'Google Summer of Code' }],
		['readme/gsoc2020/ideas.md', 'docs/gsoc2020/ideas.html', { title: 'GSoC: Project Ideas' }],
	];

	const path = require('path');

	for (const source of sources) {
		source[2].sourceMarkdownFile = source[0];
		source[2].sourceMarkdownName = path.basename(source[0], path.extname(source[0]));
		renderFileToHtml(`${rootDir}/${source[0]}`, `${rootDir}/${source[1]}`, source[2]);
	}
}

main().catch((error) => {
	console.error(error);
});
