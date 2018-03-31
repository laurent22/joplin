const fs = require('fs-extra');
const dirname = require('path').dirname;
const marked = require('marked');
const Mustache = require('mustache');

const headerHtml = `<!doctype html>
<html>
<head>
	<title>Joplin - an open source note taking and to-do application with synchronisation capabilities</title>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="https://joplin.cozic.net/css/bootstrap.min.css">
	<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
	<link rel="stylesheet" href="https://joplin.cozic.net/css/fontawesome-all.min.css"> 
	<script src="https://joplin.cozic.net/js/jquery-3.2.1.slim.min.js"></script>
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
	#toc ul {
		margin-bottom: 10px;
	}
	#toc {
		padding-bottom: 1em;
	}
	.title-icon {
		height: 2em;
	}
	.sub-title {
		font-weight: bold;
		font-size: 1.5em;
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
		min-width: 165px;
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
	.share-btn-github {
		display: inline-block;
	}
	.nav-right .small-share-btn {
		display: none;
	}
	.nav-right .share-btn-github {
		display: inline-block;
	}
	.footer {
		padding-top: 1em;
		border-top: 1px solid #d4d4d4;
		margin-top: 2em;
		color: gray;
		font-size: .9em;
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

<div class="container">

<div class="header">
	<a class="forkme" href="https://github.com/laurent22/joplin"><img src="{{{imageBaseUrl}}}/ForkMe.png"/></a>
	<a href="https://joplin.cozic.net"><h1 id="joplin"><img class="title-icon" src="{{{imageBaseUrl}}}/Icon512.png">oplin</h1></a>
	<p class="sub-title">An open source note taking and to-do application with synchronisation capabilities.</p>
</div>

<div class="nav-wrapper">
	<div class="nav">
		<ul>
			<li class="{{selectedHome}}"><a href="{{baseUrl}}/" title="Home"><i class="fa fa-home"></i></a></li>
			<li><a class="help" href="#" title="Terminal">Help</a></li>
		</ul>
		<div class="nav-right">
			<iframe class="share-btn" src="https://www.facebook.com/plugins/share_button.php?href=http%3A%2F%2Fjoplin.cozic.net&layout=button&size=small&mobile_iframe=true&width=60&height=20&appId" width="60" height="20" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowTransparency="true"></iframe>
			<iframe class="share-btn" src="https://platform.twitter.com/widgets/tweet_button.html?url=http%3A%2F%2Fjoplin.cozic.net" width="62" height="20" title="Tweet" style="border: 0; overflow: hidden;"></iframe>
			<iframe class="share-btn share-btn-github" src="https://ghbtns.com/github-btn.html?user=laurent22&repo=joplin&type=star&count=true" frameborder="0" scrolling="0" width="100px" height="20px"></iframe>
		</div>
	</div>
</div>

<div class="content">
	{{{tocHtml}}}
`;

const footerHtml = `
<div class="footer">
Copyright (c) 2016-2018 Laurent Cozic
</div>
</body>
</html>
`;

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

function markdownToHtml(md) {
	const renderer = new marked.Renderer();

	let output = marked(md, {
		gfm: true,
		break: true,
		renderer: renderer,
	});

	return headerHtml + output + scriptHtml + footerHtml;
}

let tocMd_ = null;
let tocHtml_ = null;
const tocRegex_ = /<!-- TOC -->([^]*)<!-- TOC -->/
function tocMd() {
	if (tocMd_) return tocMd_;
	const md = fs.readFileSync(rootDir + '/README.md', 'utf8');
	const toc = md.match(tocRegex_);
	tocMd_ = toc[1];
	return tocMd_;
}

function tocHtml() {
	if (tocHtml_) return tocHtml_;
	const MarkdownIt = require('markdown-it');
	const markdownIt = new MarkdownIt();
	let md = tocMd();
	md = md.replace(/# Table of contents/, '');
	md = md.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/master\/readme\/(.*)\.md/g, 'https://joplin.cozic.net/$1');
	tocHtml_ = markdownIt.render(md);
	tocHtml_ = '<div id="toc">' + tocHtml_ + '</div>';
	return tocHtml_;
}

function renderMdToHtml(md, targetPath, params) {
	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin\n/, '');

	params.baseUrl = 'https://joplin.cozic.net';
	params.imageBaseUrl = params.baseUrl + '/images';
	params.tocHtml = tocHtml();
	const html = Mustache.render(markdownToHtml(md), params);
	fs.writeFileSync(targetPath, html);
}

function renderFileToHtml(sourcePath, targetPath, params) {
	const md = fs.readFileSync(sourcePath, 'utf8');
	return renderMdToHtml(md, targetPath, params);
}

function makeHomePageMd() {
	let md = fs.readFileSync(rootDir + '/README.md', 'utf8');
	md = md.replace(tocRegex_, '');
	return md;
}

async function main() {
	tocMd();

	// renderFileToHtml(rootDir + '/README.md', rootDir + '/docs/index.html', {
	// 	selectedHome: 'selected',
	// });

	// renderFileToHtml(rootDir + '/readme/terminal.md', rootDir + '/docs/terminal/index.html', {
	// 	selectedTerminal: 'selected',
	// });

	// renderFileToHtml(rootDir + '/readme/desktop.md', rootDir + '/docs/desktop/index.html', {
	// 	selectedDesktop: 'selected',
	// });

	// let readmeMd = fs.readFileSync(rootDir + '/README.md', 'utf8');

	renderMdToHtml(makeHomePageMd(), rootDir + '/docs/index.html', {});

	// renderFileToHtml(rootDir + '/README.md', rootDir + '/docs/index.html', {});
	renderFileToHtml(rootDir + '/readme/terminal.md', rootDir + '/docs/terminal/index.html', {});
	renderFileToHtml(rootDir + '/readme/desktop.md', rootDir + '/docs/desktop/index.html', {});
	renderFileToHtml(rootDir + '/readme/mobile.md', rootDir + '/docs/mobile/index.html', {});
	renderFileToHtml(rootDir + '/readme/e2ee.md', rootDir + '/docs/e2ee/index.html', {});
	renderFileToHtml(rootDir + '/readme/spec.md', rootDir + '/docs/spec/index.html', {});
	renderFileToHtml(rootDir + '/readme/stats.md', rootDir + '/docs/stats/index.html', {});
	renderFileToHtml(rootDir + '/readme/changelog.md', rootDir + '/docs/changelog/index.html', {});
	renderFileToHtml(rootDir + '/readme/donate.md', rootDir + '/docs/donate/index.html', {});
}

main().catch((error) => {
	console.error(error);
});