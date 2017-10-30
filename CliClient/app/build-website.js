require('source-map-support').install();
require('babel-plugin-transform-runtime');

import fs from 'fs-extra';
import { fileExtension, basename, dirname } from 'lib/path-utils.js';
import { _, setLocale, languageCode } from 'lib/locale.js';
import marked from 'lib/marked.js';

const headerHtml = `
<!doctype html>
<html>
<head>
	<title>Joplin - a free, open source, note taking and to-do application with synchronisation capabilities</title>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
	<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
	<style>
	body {
		background-color: #F1F1F1;
		color: #333333;
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
	h1 {
		font-weight: bold;
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
	.content {
		padding-left: 2em;
		padding-right: 2em;
		padding-bottom: 2em;
	}
	.forkme {
		position: absolute;
		right: 0;
		top:0;
	}
	</style>
</head>

<body>

<div class="container">

<div class="header">
	<a class="forkme" href="https://github.com/laurent22/joplin"><img src="docs/images/ForkMe.png"/></a>
	<h1 id="joplin"><img class="title-icon" src="docs/images/Icon512.png">oplin</h1>
	<p class="sub-title">A free, open source, note taking and to-do application with synchronisation capabilities.</p>
</div>

<div class="content">
`;

const footerHtml = `
<hr/>Copyright (c) 2016-2017 Laurent Cozic
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
//     Vacation plans ☀️
// 			</pre>
// 		</td>
// 	</tr>
// </table>
// `;

const gaHtml = `
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-103586105-1', 'auto');
  ga('send', 'pageview');

</script>
`;

const rootDir = dirname(dirname(__dirname));

function markdownToHtml(md) {
	const renderer = new marked.Renderer();

	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin/, '');

	let output = marked(md, {
		gfm: true,
		break: true,
		renderer: renderer,
	});

	//output = output.replace(/<!-- \[SCREENSHOTS\] -->/, screenshotHtml);

	return headerHtml + output + gaHtml + footerHtml;
}

async function main() {
	const md = fs.readFileSync(rootDir + '/README.md', 'utf8');
	const html = markdownToHtml(md);

	fs.writeFileSync(rootDir + '/index.html', html);
}

main().catch((error) => {
	console.error(error);
});