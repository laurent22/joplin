const MarkdownIt = require('markdown-it');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const ModelCache = require('lib/ModelCache');
const { shim } = require('lib/shim.js');
const md5 = require('md5');

class MdToHtml {

	constructor(options = null) {
		if (!options) options = {};

		this.supportsResourceLinks_ = !!options.supportsResourceLinks;
		this.loadedResources_ = {};
		this.cachedContent_ = null;
		this.cachedContentKey_ = null;
		this.modelCache_ = new ModelCache();

		// Must include last "/"
		this.resourceBaseUrl_ = ('resourceBaseUrl' in options) ? options.resourceBaseUrl : null;
	}

	makeContentKey(resources, body, style, options) {
		let k = [];
		for (let n in resources) {
			if (!resources.hasOwnProperty(n)) continue;
			const r = resources[n];
			k.push(r.id);
		}
		k.push(md5(body));
		k.push(md5(JSON.stringify(style)));
		k.push(md5(JSON.stringify(options)));
		return k.join('_');
	}

	renderAttrs_(attrs) {
		if (!attrs) return '';

		let output = [];
		for (let i = 0; i < attrs.length; i++) {
			const n = attrs[i][0];
			const v = attrs[i].length >= 2 ? attrs[i][1] : null;

			if (n === 'alt' && !v) {
				continue;
			} else if (n === 'src') {
				output.push('src="' + htmlentities(v) + '"');
			} else {
				output.push(n + '="' + (v ? htmlentities(v) : '') + '"');
			}
		}
		return output.join(' ');
	}

	getAttr_(attrs, name) {
		for (let i = 0; i < attrs.length; i++) {
			if (attrs[i][0] === name) return attrs[i].length > 1 ? attrs[i][1] : null;
		}
		return null;
	}

	setAttr_(attrs, name, value) {
		for (let i = 0; i < attrs.length; i++) {
			if (attrs[i][0] === name) {
				attrs[i][1] = value;
				return attrs;
			}
		}
		attrs.push([name, value]);
		return attrs;
	}

	renderImage_(attrs, options) {
		const loadResource = async (id) => {
			console.info('Loading resource: ' + id);

			// Initially set to to an empty object to make
			// it clear that it is being loaded. Otherwise
			// it sometimes results in multiple calls to
			// loadResource() for the same resource.
			this.loadedResources_[id] = {};

			const resource = await Resource.load(id);
			//const resource = await this.modelCache_.load(Resource, id);

			if (!resource) {
				// Can happen for example if an image is attached to a note, but the resource hasn't
				// been downloaded from the sync target yet.
				console.warn('Cannot load resource: ' + id);
				return;
			}

			this.loadedResources_[id] = resource;

			if (options.onResourceLoaded) options.onResourceLoaded();
		}

		const title = this.getAttr_(attrs, 'title');
		const href = this.getAttr_(attrs, 'src');

		if (!Resource.isResourceUrl(href)) {
			return '<img title="' + htmlentities(title) + '" src="' + href + '"/>';
		}

		const resourceId = Resource.urlToId(href);
		const resource = this.loadedResources_[resourceId];
		if (!resource) {
			loadResource(resourceId);
			return '';
		}

		if (!resource.id) return ''; // Resource is being loaded

		const mime = resource.mime ? resource.mime.toLowerCase() : '';
		if (mime == 'image/png' || mime == 'image/jpg' || mime == 'image/jpeg' || mime == 'image/gif') {
			let src = './' + Resource.filename(resource);
			if (this.resourceBaseUrl_ !== null) src = this.resourceBaseUrl_ + src;
			let output = '<img title="' + htmlentities(title) + '" src="' + src + '"/>';
			return output;
		}
		
		return '[Image: ' + htmlentities(resource.title) + ' (' + htmlentities(mime) + ')]';
	}

	renderOpenLink_(attrs, options) {
		let href = this.getAttr_(attrs, 'href');
		const text = this.getAttr_(attrs, 'text');
		const isResourceUrl = Resource.isResourceUrl(href);
		const title = isResourceUrl ? this.getAttr_(attrs, 'title') : href;

		if (isResourceUrl && !this.supportsResourceLinks_) {
			// In mobile, links to local resources, such as PDF, etc. currently aren't supported.
			// Ideally they should be opened in the user's browser.
			return '<span style="opacity: 0.5">(Resource not yet supported: '; //+ htmlentities(text) + ']';
		} else {
			if (isResourceUrl) {
				const resourceId = Resource.pathToId(href);
				href = 'joplin://' + resourceId;
			}

			const js = options.postMessageSyntax + "(" + JSON.stringify(href) + "); return false;";
			let output = "<a title='" + htmlentities(title) + "' href='#' onclick='" + js + "'>";
			return output;
		}
	}

	renderCloseLink_(attrs, options) {
		const href = this.getAttr_(attrs, 'href');
		const isResourceUrl = Resource.isResourceUrl(href);

		if (isResourceUrl && !this.supportsResourceLinks_) {
			return ')</span>';
		} else {
			return '</a>';
		}
	}

	renderTokens_(tokens, options) {
		let output = [];
		let previousToken = null;
		let anchorAttrs = [];
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			const nextToken = i < tokens.length ? tokens[i+1] : null;

			let tag = t.tag;
			let openTag = null;
			let closeTag = null;
			let attrs = t.attrs ? t.attrs : [];
			const isCodeBlock = tag === 'code' && t.block;

			// if (t.map) attrs.push(['data-map', t.map.join(':')]);

			if (previousToken && previousToken.tag === 'li' && tag === 'p') {
				// Markdown-it render list items as <li><p>Text<p></li> which makes it
				// complicated to style and layout the HTML, so we remove this extra
				// <p> here and below in closeTag.
				openTag = null;
			} else if (tag && t.type.indexOf('_open') >= 0) {
				openTag = tag;
			} else if (tag && t.type.indexOf('_close') >= 0) {
				closeTag = tag;
			} else if (tag && t.type.indexOf('inline') >= 0) {
				openTag = tag;
			} else if (t.type === 'link_open') {
				openTag = 'a';
			} else if (isCodeBlock) {
				openTag = 'pre';
			}

			if (openTag) {
				if (openTag === 'a') {
					anchorAttrs.push(attrs);
					output.push(this.renderOpenLink_(attrs, options));
				} else {
					const attrsHtml = this.renderAttrs_(attrs);
					output.push('<' + openTag + (attrsHtml ? ' ' + attrsHtml : '') + '>');
				}
			}

			if (isCodeBlock) {
				const codeAttrs = ['code'];
				if (t.info) codeAttrs.push(t.info); // t.info contains the language when the token is a codeblock
				output.push('<code class="' + codeAttrs.join(' ') + '">');
			}

			if (t.type === 'image') {
				if (t.content) attrs.push(['title', t.content]);
				output.push(this.renderImage_(attrs, options));
			} else if (t.type === 'softbreak') {
				output.push('<br/>');
			} else if (t.type === 'hr') {
				output.push('<hr/>');
			} else {
				if (t.children) {
					const parsedChildren = this.renderTokens_(t.children, options);
					output = output.concat(parsedChildren);
				} else {
					if (t.content) {
						output.push(htmlentities(t.content));
					}
				}
			}
 
 			if (nextToken && nextToken.tag === 'li' && t.tag === 'p') {
 				closeTag = null;
 			} else if (t.type === 'link_close') {
				closeTag = 'a';
			} else if (tag && t.type.indexOf('inline') >= 0) {
				closeTag = openTag;
			} else if (isCodeBlock) {
				closeTag = openTag;
			}

			if (isCodeBlock) output.push('</code>');

			if (closeTag) {
				if (closeTag === 'a') {
					output.push(this.renderCloseLink_(anchorAttrs.pop(), options));
				} else {
					output.push('</' + closeTag + '>');
				}
			}

			previousToken = t;
		}
		return output.join('');
	}

	render(body, style, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';

		const cacheKey = this.makeContentKey(this.loadedResources_, body, style, options);
		if (this.cachedContentKey_ === cacheKey) return this.cachedContent_;

		const md = new MarkdownIt({
			breaks: true,
			linkify: true,
		});
		const env = {};

		// Hack to make checkboxes clickable. Ideally, checkboxes should be parsed properly in
		// renderTokens_(), but for now this hack works. Marking it with HORRIBLE_HACK so
		// that it can be removed and replaced later on.
		const HORRIBLE_HACK = true;

		if (HORRIBLE_HACK) {
			let counter = -1;
			while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
				body = body.replace(/- \[(X| )\]/, function(v, p1) {
					let s = p1 == ' ' ? 'NOTICK' : 'TICK';
					counter++;
					return '- mJOPmCHECKBOXm' + s + 'm' + counter + 'm';
				});
			}
		}

		const tokens = md.parse(body, env);

		// console.info(body);
		// console.info(tokens);

		let renderedBody = this.renderTokens_(tokens, options);

		if (HORRIBLE_HACK) {
			let loopCount = 0;
			while (renderedBody.indexOf('mJOPm') >= 0) {
				renderedBody = renderedBody.replace(/mJOPmCHECKBOXm([A-Z]+)m(\d+)m/, function(v, type, index) {

					const js = options.postMessageSyntax + "('checkboxclick:" + type + ':' + index + "'); this.classList.contains('tick') ? this.classList.remove('tick') : this.classList.add('tick'); return false;";
					return '<a href="#" onclick="' + js + '" class="checkbox ' + (type == 'NOTICK' ? '' : 'tick') + '"><span>' + '' + '</span></a>';
				});
				if (loopCount++ >= 9999) break;
			}
		}

		// https://necolas.github.io/normalize.css/
		const normalizeCss = `
			html{line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}
			article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0;overflow:visible}
			pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}
			b,strong{font-weight:bolder}small{font-size:80%}img{border-style:none}
		`;

		const fontFamily = 'sans-serif';

		const css = `
			body {
				font-size: ` + style.htmlFontSize + `;
				color: ` + style.htmlColor + `;
				line-height: ` + style.htmlLineHeight + `;
				background-color: ` + style.htmlBackgroundColor + `;
				font-family: ` + fontFamily + `;
				padding-bottom: ` + options.paddingBottom + `;
			}
			p, h1, h2, h3, h4, h5, h6, ul, table {
				margin-top: 0;
				margin-bottom: 14px;
			}
			h1 {
				font-size: 1.5em;
				font-weight: bold;
			}
			h2 {
				font-size: 1.2em;
				font-weight: bold;
			}
			h3, h4, h5, h6 {
				font-size: 1em;
				font-weight: bold;
			}
			a {
				color: ` + style.htmlLinkColor + `
			}
			ul {
				padding-left: 1.3em;
			}
			a.checkbox {
				display: inline-block;
				position: relative;
				top: .5em;
				text-decoration: none;
				width: 1.65em; /* Need to cut a bit the right border otherwise the SVG will display a black line */
				height: 1.7em;
				margin-right: .3em;
				background-color:  ` + style.htmlColor + `;
				/* Awesome Font square-o */
				-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1312 256h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113v-832q0-66-47-113t-113-47zm288 160v832q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q119 0 203.5 84.5t84.5 203.5z'/></svg>");
			}
			a.checkbox.tick {
				left: .1245em; /* square-o and check-square-o aren't exactly aligned so add this extra gap to align them  */
				/* Awesome Font check-square-o */
				-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1472 930v318q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q63 0 117 25 15 7 18 23 3 17-9 29l-49 49q-10 10-23 10-3 0-9-2-23-6-45-6h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113v-254q0-13 9-22l64-64q10-10 23-10 6 0 12 3 20 8 20 29zm231-489l-814 814q-24 24-57 24t-57-24l-430-430q-24-24-24-57t24-57l110-110q24-24 57-24t57 24l263 263 647-647q24-24 57-24t57 24l110 110q24 24 24 57t-24 57z'/></svg>");
			}
			table {
				border-collapse: collapse;
			}
			td, th {
				border: 1px solid silver;
				padding: .5em 1em .5em 1em;
				font-size: ` + style.htmlFontSize + `;
				color: ` + style.htmlColor + `;
				background-color: ` + style.htmlBackgroundColor + `;
				font-family: ` + fontFamily + `;
			}
			hr {
				border: none;
				border-bottom: 1px solid ` + style.htmlDividerColor + `;
			}
			img {
				width: auto;
				max-width: 100%;
			}
		`;

		const styleHtml = '<style>' + normalizeCss + "\n" + css + '</style>';

		const output = styleHtml + renderedBody;

		this.cachedContent_ = output;
		this.cachedContentKey_ = cacheKey;
		return this.cachedContent_;
	}

	toggleTickAt(body, index) {
		let counter = -1;
		while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
			counter++;

			body = body.replace(/- \[(X| )\]/, function(v, p1) {
				let s = p1 == ' ' ? 'NOTICK' : 'TICK';
				if (index == counter) {
					s = s == 'NOTICK' ? 'TICK' : 'NOTICK';
				}
				return '°°JOP°CHECKBOX°' + s + '°°';
			});
		}

		body = body.replace(/°°JOP°CHECKBOX°NOTICK°°/g, '- [ ]'); 
		body = body.replace(/°°JOP°CHECKBOX°TICK°°/g, '- [X]'); 

		return body;
	}

	handleCheckboxClick(msg, noteBody) {
		msg = msg.split(':');
		let index = Number(msg[msg.length - 1]);
		let currentState = msg[msg.length - 2]; // Not really needed but keep it anyway
		return this.toggleTickAt(noteBody, index);		
	}

}

module.exports = MdToHtml;