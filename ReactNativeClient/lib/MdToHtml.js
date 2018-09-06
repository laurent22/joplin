const MarkdownIt = require('markdown-it');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const ModelCache = require('lib/ModelCache');
const ObjectUtils = require('lib/ObjectUtils');
const { shim } = require('lib/shim.js');
const { _ } = require('lib/locale');
const md5 = require('md5');
const MdToHtml_Katex = require('lib/MdToHtml_Katex');

class MdToHtml {

	constructor(options = null) {
		if (!options) options = {};

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
		k.push(md5(escape(body))); // https://github.com/pvorb/node-md5/issues/41
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

	getAttr_(attrs, name, defaultValue = null) {
		for (let i = 0; i < attrs.length; i++) {
			if (attrs[i][0] === name) return attrs[i].length > 1 ? attrs[i][1] : null;
		}
		return defaultValue;
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
			// console.info('Loading resource: ' + id);

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
		if (Resource.isSupportedImageMimeType(mime)) {
			let src = './' + Resource.filename(resource);
			if (this.resourceBaseUrl_ !== null) src = this.resourceBaseUrl_ + src;
			let output = '<img data-resource-id="' + resource.id + '" title="' + htmlentities(title) + '" src="' + src + '"/>';
			return output;
		}
		
		return '[Image: ' + htmlentities(resource.title) + ' (' + htmlentities(mime) + ')]';
	}

	renderOpenLink_(attrs, options) {
		let href = this.getAttr_(attrs, 'href');
		const text = this.getAttr_(attrs, 'text');
		const isResourceUrl = Resource.isResourceUrl(href);
		const title = isResourceUrl ? this.getAttr_(attrs, 'title') : href;

		let resourceIdAttr = "";
		let icon = "";
		let hrefAttr = '#';
		if (isResourceUrl) {
			const resourceId = Resource.pathToId(href);
			href = "joplin://" + resourceId;
			resourceIdAttr = "data-resource-id='" + resourceId + "'";
			icon = '<span class="resource-icon"></span>';
		} else {
			// If the link is a plain URL (as opposed to a resource link), set the href to the actual
			// link. This allows the link to be exported too when exporting to PDF. 
			hrefAttr = href;
		}

		const js = options.postMessageSyntax + "(" + JSON.stringify(href) + "); return false;";
		let output = "<a " + resourceIdAttr + " title='" + htmlentities(title) + "' href='" + hrefAttr + "' onclick='" + js + "'>" + icon;
		return output;
	}

	renderCloseLink_(attrs, options) {
		return '</a>';
	}

	rendererPlugin_(language) {
		if (!language) return null;

		if (!this.rendererPlugins_) {
			this.rendererPlugins_ = {};
			this.rendererPlugins_['katex'] = new MdToHtml_Katex();
		}

		return language in this.rendererPlugins_ ? this.rendererPlugins_[language] : null;
	}

	parseInlineCodeLanguage_(content) {
		const m = content.match(/^\{\.([a-zA-Z0-9]+)\}/);
		if (m && m.length >= 2) {
			const language = m[1];
			return {
				language: language,
				newContent: content.substr(language.length + 3),
			};
		}

		return null;
	}

	urldecode_(str) {
		try {
			return decodeURIComponent((str+'').replace(/\+/g, '%20'));
		} catch (error) {
			// decodeURIComponent can throw if the string contains non-encoded data (for example "100%")
			// so in this case just return the non encoded string. 
			return str;
		}
	}


	renderTokens_(markdownIt, tokens, options) {
		let output = [];
		let previousToken = null;
		let anchorAttrs = [];
		let extraCssBlocks = {};
		let anchorHrefs = [];

		for (let i = 0; i < tokens.length; i++) {
			let t = tokens[i];
			const nextToken = i < tokens.length ? tokens[i+1] : null;

			let tag = t.tag;
			let openTag = null;
			let closeTag = null;
			let attrs = t.attrs ? t.attrs : [];
			let tokenContent = t.content ? t.content : '';
			const isCodeBlock = tag === 'code' && t.block;
			const isInlineCode = t.type === 'code_inline';
			const codeBlockLanguage = t && t.info ? t.info : null;
			let rendererPlugin = null;
			let rendererPluginOptions = { tagType: 'inline' };
			let linkHref = null;

			if (isCodeBlock) rendererPlugin = this.rendererPlugin_(codeBlockLanguage);

			if (isInlineCode) {
				openTag = null;
			} else if (tag && (t.type.indexOf('html_inline') >= 0 || t.type.indexOf('html_block') >= 0)) {
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
				if (rendererPlugin) {
					openTag = null;
				} else {
					openTag = 'pre';
				}
			}

			if (openTag) {
				if (openTag === 'a') {
					anchorAttrs.push(attrs);
					anchorHrefs.push(this.getAttr_(attrs, 'href'));
					output.push(this.renderOpenLink_(attrs, options));
				} else {
					const attrsHtml = this.renderAttrs_(attrs);
					output.push('<' + openTag + (attrsHtml ? ' ' + attrsHtml : '') + '>');
				}
			}

			if (isCodeBlock) {
				const codeAttrs = ['code'];
				if (!rendererPlugin) {
					if (codeBlockLanguage) codeAttrs.push(t.info); // t.info contains the language when the token is a codeblock
					output.push('<code class="' + codeAttrs.join(' ') + '">');
				}
			} else if (isInlineCode) {
				const result = this.parseInlineCodeLanguage_(tokenContent);
				if (result) {
					rendererPlugin = this.rendererPlugin_(result.language);
					tokenContent = result.newContent;
				}

				if (!rendererPlugin) {
					output.push('<code class="inline-code">');
				}
			}

			if (t.type === 'math_inline' || t.type === 'math_block') {
				rendererPlugin = this.rendererPlugin_('katex');
				rendererPluginOptions = { tagType: t.type === 'math_block' ? 'block' : 'inline' };
			}

			if (rendererPlugin) {
				rendererPlugin.loadAssets().catch((error) => {
					console.warn('MdToHtml: Error loading assets for ' + rendererPlugin.name() + ': ', error.message);
				});
			}

			if (t.type === 'image') {
				if (tokenContent) attrs.push(['title', tokenContent]);
				output.push(this.renderImage_(attrs, options));
			} else if (t.type === 'html_inline' || t.type === 'html_block') {
				output.push(t.content);
			} else if (t.type === 'softbreak') {
				output.push('<br/>');
			} else if (t.type === 'hr') {
				output.push('<hr/>');
			} else {
				if (t.children) {
					const parsedChildren = this.renderTokens_(markdownIt, t.children, options);
					output = output.concat(parsedChildren);
				} else {
					if (tokenContent) {
						if ((isCodeBlock || isInlineCode) && rendererPlugin) {
							output = rendererPlugin.processContent(output, tokenContent, isCodeBlock ? 'block' : 'inline');
						} else if (rendererPlugin) {
							output = rendererPlugin.processContent(output, tokenContent, rendererPluginOptions.tagType);
						} else {
							output.push(htmlentities(tokenContent));
						}
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
				if (!rendererPlugin) closeTag = openTag;
			}

			if (isCodeBlock) {
				if (!rendererPlugin) {
					output.push('</code>');
				}
			} else if (isInlineCode) {
				if (!rendererPlugin) {
					output.push('</code>');
				}
			}

			if (closeTag) {
				if (closeTag === 'a') {
					const currentAnchorAttrs = anchorAttrs.pop();

					// NOTE: Disabled for now due to this:
					// https://github.com/laurent22/joplin/issues/318#issuecomment-375854848

					// const previousContent = output.length ? output[output.length - 1].trim() : '';
					// const anchorHref = this.getAttr_(currentAnchorAttrs, 'href', '').trim();

					// Optimisation: If the content of the anchor is the same as the URL, we replace the content
					// by (Link). This is to shorten the text, which is important especially when the note comes
					// from imported HTML, which can contain many such links and make the text unreadble. An example
					// would be a movie review that has multiple links to allow a user to rate the film from 1 to 5 stars.
					// In the original page, it might be rendered as stars, via CSS, but in the imported note it would look like this:
					// http://example.com/rate/1 http://example.com/rate/2 http://example.com/rate/3
					// http://example.com/rate/4 http://example.com/rate/5
					// which would take a lot of screen space even though it doesn't matter since the user is unlikely
					// to rate the film from the note. This is actually a nice example, still readable, but there is way
					// worse that this in notes that come from web-clipped content.
					// With this change, the links will still be preserved but displayed like
					// (link) (link) (link) (link) (link)

					// if (this.urldecode_(previousContent) === htmlentities(this.urldecode_(anchorHref))) {
					// 	output.pop();
					// 	output.push(_('(Link)'));
					// }

					output.push(this.renderCloseLink_(currentAnchorAttrs, options));
				} else {
					output.push('</' + closeTag + '>');
				}
			}

			if (rendererPlugin) {
				const extraCss = rendererPlugin.extraCss();
				const name = rendererPlugin.name();
				if (extraCss && !(name in extraCssBlocks)) {
					extraCssBlocks[name] = extraCss;
				}
			}

			previousToken = t;
		}

		// Insert the extra CSS at the top of the HTML

		if (!ObjectUtils.isEmpty(extraCssBlocks)) {
			const temp = ['<style>'];
			for (let n in extraCssBlocks) {
				if (!extraCssBlocks.hasOwnProperty(n)) continue;
				temp.push(extraCssBlocks[n]);
			}
			temp.push('</style>');

			output = temp.concat(output);
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
			html: true,
		});

		// Add `file:` protocol in linkify to allow text in the format of "file://..." to translate into
		// file-URL links in html view
		md.linkify.add('file:', {

		  validate: function (text, pos, self) {
		    var tail = text.slice(pos);

		    if (!self.re.file) {
		      self.re.file =  new RegExp(
			'^[\\/]{2,3}[\\S]+' // matches all local file URI on Win/Unix/MacOS systems including reserved characters in some OS (i.e. no OS specific sanity check)
		      );
		    }
		    if (self.re.file.test(tail)) {
		      return tail.match(self.re.file)[0].length;
		    }
		    return 0;
		}
			
		});

		// enable file link URLs in MarkdownIt. Keeps other URL restrictions of MarkdownIt untouched.
		// Format [link name](file://...)		
		md.validateLink = function (url) {

			var BAD_PROTO_RE = /^(vbscript|javascript|data):/;
			var GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;

	    		// url should be normalized at this point, and existing entities are decoded
			var str = url.trim().toLowerCase();

			return BAD_PROTO_RE.test(str) ? (GOOD_DATA_RE.test(str) ? true : false) : true;

		}

		// This is currently used only so that the $expression$ and $$\nexpression\n$$ blocks are translated
		// to math_inline and math_block blocks. These blocks are then processed directly with the Katex
		// library.  It is better this way as then it is possible to conditionally load the CSS required by
		// Katex and use an up-to-date version of Katex (as of 2018, the plugin is still using 0.6, which is
		// buggy instead of 0.9).
		md.use(require('markdown-it-katex'));

		// Hack to make checkboxes clickable. Ideally, checkboxes should be parsed properly in
		// renderTokens_(), but for now this hack works. Marking it with HORRIBLE_HACK so
		// that it can be removed and replaced later on.
		const HORRIBLE_HACK = true;

		if (HORRIBLE_HACK) {
			let counter = -1;
			while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0 || body.indexOf('- [x]') >= 0) {
				body = body.replace(/- \[(X| |x)\]/, function(v, p1) {
					let s = p1 == ' ' ? 'NOTICK' : 'TICK';
					counter++;
					return '- mJOPmCHECKBOXm' + s + 'm' + counter + 'm';
				});
			}
		}

		const env = {};
		const tokens = md.parse(body, env);

		let renderedBody = this.renderTokens_(md, tokens, options);

		// console.info(body);
		// console.info(tokens);
		// console.info(renderedBody);

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
			li p {
				margin-bottom: 0;
			}
			.resource-icon {
				display: inline-block;
				position: relative;
				top: .5em;
				text-decoration: none;
				width: 1.15em;
				height: 1.5em;
				margin-right: 0.4em;
				background-color:  ` + style.htmlColor + `;
				/* Awesome Font file */
				-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1892' xmlns='http://www.w3.org/2000/svg'><path d='M288 128C129 128 0 257 0 416v960c0 159 129 288 288 288h960c159 0 288-129 288-288V416c0-159-129-288-288-288H288zm449.168 236.572l263.434.565 263.431.562.584 73.412.584 73.412-42.732 1.504c-23.708.835-47.002 2.774-52.322 4.36-14.497 4.318-23.722 12.902-29.563 27.51l-5.12 12.802-1.403 291.717c-1.425 295.661-1.626 302.586-9.936 343.043-15.2 74-69.604 150.014-142.197 198.685-58.287 39.08-121.487 60.47-208.155 70.45-22.999 2.648-122.228 2.636-141.976-.024l-.002.006c-69.785-9.377-108.469-20.202-154.848-43.332-85.682-42.73-151.778-116.991-177.537-199.469-10.247-32.81-11.407-40.853-11.375-78.754.026-31.257.76-39.15 5.024-54.043 8.94-31.228 20.912-51.733 43.56-74.62 27.312-27.6 55.812-40.022 95.524-41.633 37.997-1.542 63.274 5.024 87.23 22.66 15.263 11.235 30.828 33.238 39.537 55.884 5.52 14.355 5.949 18.31 7.549 69.569 1.675 53.648 3.05 63.99 11.674 87.785 11.777 32.499 31.771 55.017 61.46 69.22 26.835 12.838 47.272 16.785 80.56 15.56 21.646-.798 30.212-2.135 43.208-6.741 38.682-13.708 70.96-44.553 86.471-82.635 16.027-39.348 15.995-38.647 15.947-361.595-.042-283.26-.09-286.272-4.568-296.153-10.958-24.171-22.488-28.492-81.074-30.377l-42.969-1.38v-147.95z'/></svg>");
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
			.inline-code {
				border: 1px solid #CBCBCB;
				background-color: #eff0f1;
				padding-right: .2em;
				padding-left: .2em;
			}

			@media print {
				body {
					height: auto !important;
				}

				a.checkbox {
					border: 1pt solid ` + style.htmlColor + `;
					border-radius: 2pt;
					width: 1em;
					height: 1em;
					line-height: 1em;
					text-align: center;
					top: .4em;
				}

				a.checkbox.tick:after {
					content: "X";
				}

				a.checkbox.tick {
					top: 0;
					left: -0.02em;
					color: ` + style.htmlColor + `;
				}

				pre {
					white-space: pre-wrap;
				}

				.code, .inline-code {
					border: 1px solid #CBCBCB;
				}
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
		while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0 || body.indexOf('- [x]') >= 0) {
			counter++;

			body = body.replace(/- \[(X| |x)\]/, function(v, p1) {
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
