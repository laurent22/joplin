const Resource = require('lib/models/Resource.js');
const utils = require('../../utils');
const htmlUtils = require('lib/htmlUtils.js');

function parseNextNumber(str, pos, max) {
	var code,
		start = pos,
		result = {
			ok: false,
			pos: pos,
			value: '',
		};

	code = str.charCodeAt(pos);

	while (pos < max && (code >= 0x30 /* 0 */ && code <= 0x39 /* 9 */) || code === 0x25 /* % */) {
		code = str.charCodeAt(++pos);
	}

	result.ok = true;
	result.pos = pos;
	result.value = str.slice(start, pos);

	return result;
}

function parseImageSize(str, pos, max) {
	var code,
		result = {
			ok: false,
			pos: 0,
			width: '',
			height: '',
		};

	if (pos >= max) { return result; }

	code = str.charCodeAt(pos);

	if (code !== 0x3d /* = */) { return result; }

	pos++;

	// size must follow = without any white spaces as follows
	// (1) =300x200
	// (2) =300x
	// (3) =x200
	code = str.charCodeAt(pos);
	if (code !== 0x78 /* x */ && (code < 0x30 || code  > 0x39) /* [0-9] */) {
		return result;
	}

	// parse width
	var resultW = parseNextNumber(str, pos, max);
	pos = resultW.pos;

	// next charactor must be 'x'
	code = str.charCodeAt(pos);
	if (code !== 0x78 /* x */) { return result; }

	pos++;

	// parse height
	var resultH = parseNextNumber(str, pos, max);
	pos = resultH.pos;

	console.log([resultW.value, resultH.value]);
	result.width = resultW.value;
	result.height = resultH.value;
	result.pos = pos;
	result.ok = true;
	return result;
}


function image_with_size(md) {
	return function(state, silent) {
		var attrs,
			code,
			label,
			labelEnd,
			labelStart,
			pos,
			ref,
			res,
			title,
			width = '',
			height = '',
			token,
			tokens,
			start,
			href = '',
			oldPos = state.pos,
			max = state.posMax;

		if (state.src.charCodeAt(state.pos) !== 0x21/* ! */) { return false; }
		if (state.src.charCodeAt(state.pos + 1) !== 0x5B/* [ */) { return false; }

		labelStart = state.pos + 2;
		labelEnd = md.helpers.parseLinkLabel(state, state.pos + 1, false);

		// parser failed to find ']', so it's not a valid link
		if (labelEnd < 0) { return false; }

		pos = labelEnd + 1;
		if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {

			//
			// Inline link
			//

			// [link](  <href>  "title"  )
			//        ^^ skipping these spaces
			pos++;
			for (; pos < max; pos++) {
				code = state.src.charCodeAt(pos);
				if (code !== 0x20 && code !== 0x0A) { break; }
			}
			if (pos >= max) { return false; }

			// [link](  <href>  "title"  )
			//          ^^^^^^ parsing link destination
			start = pos;
			res = md.helpers.parseLinkDestination(state.src, pos, state.posMax);
			if (res.ok) {
				href = state.md.normalizeLink(res.str);
				if (state.md.validateLink(href)) {
					pos = res.pos;
				} else {
					href = '';
				}
			}

			// [link](  <href>  "title"  )
			//                ^^ skipping these spaces
			start = pos;
			for (; pos < max; pos++) {
				code = state.src.charCodeAt(pos);
				if (code !== 0x20 && code !== 0x0A) { break; }
			}

			// [link](  <href>  "title"  )
			//                  ^^^^^^^ parsing link title
			res = md.helpers.parseLinkTitle(state.src, pos, state.posMax);
			if (pos < max && start !== pos && res.ok) {
				title = res.str;
				pos = res.pos;

				// [link](  <href>  "title"  )
				//                         ^^ skipping these spaces
				for (; pos < max; pos++) {
					code = state.src.charCodeAt(pos);
					if (code !== 0x20 && code !== 0x0A) { break; }
				}
			} else {
				title = '';
			}

			// [link](  <href>  "title" =WxH  )
			//                          ^^^^ parsing image size
			if (pos - 1 >= 0) {
				code = state.src.charCodeAt(pos - 1);

				// there must be at least one white spaces
				// between previous field and the size
				if (code === 0x20) {
					res = parseImageSize(state.src, pos, state.posMax);
					if (res.ok) {
						width = res.width;
						height = res.height;
						pos = res.pos;

						// [link](  <href>  "title" =WxH  )
						//                              ^^ skipping these spaces
						for (; pos < max; pos++) {
							code = state.src.charCodeAt(pos);
							if (code !== 0x20 && code !== 0x0A) { break; }
						}
					}
				}
			}

			if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
				state.pos = oldPos;
				return false;
			}
			pos++;

		} else {
			//
			// Link reference
			//
			if (typeof state.env.references === 'undefined') { return false; }

			// [foo]  [bar]
			//      ^^ optional whitespace (can include newlines)
			for (; pos < max; pos++) {
				code = state.src.charCodeAt(pos);
				if (code !== 0x20 && code !== 0x0A) { break; }
			}

			if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
				start = pos + 1;
				pos = md.helpers.parseLinkLabel(state, pos);
				if (pos >= 0) {
					label = state.src.slice(start, pos++);
				} else {
					pos = labelEnd + 1;
				}
			} else {
				pos = labelEnd + 1;
			}

			// covers label === '' and label === undefined
			// (collapsed reference link and shortcut reference link respectively)
			if (!label) { label = state.src.slice(labelStart, labelEnd); }

			ref = state.env.references[md.utils.normalizeReference(label)];
			if (!ref) {
				state.pos = oldPos;
				return false;
			}
			href = ref.href;
			title = ref.title;
		}

		//
		// We found the end of the link, and know for a fact it's a valid link;
		// so all that's left to do is to call tokenizer.
		//
		if (!silent) {
			state.pos = labelStart;
			state.posMax = labelEnd;

			var newState = new state.md.inline.State(
				state.src.slice(labelStart, labelEnd),
				state.md,
				state.env,
				tokens = []
			);
			newState.md.inline.tokenize(newState);

			token          = state.push('image', 'img', 0);
			token.attrs    = attrs = [ [ 'src', href ],
				[ 'alt', '' ] ];
			token.children = tokens;
			if (title) {
				attrs.push([ 'title', title ]);
			}

			if (width !== '') {
				attrs.push([ 'width', width ]);
			}

			if (height !== '') {
				attrs.push([ 'height', height ]);
			}
		}

		state.pos = pos;
		state.posMax = max;
		return true;
	};
}

function installRule(markdownIt, mdOptions, ruleOptions) {
	// markdownIt.ruler.push('image', (x,y) => console.log({x,y}))
	markdownIt.inline.ruler.before('emphasis', 'image', image_with_size(markdownIt, mdOptions));

	const defaultRender = markdownIt.renderer.rules.image;

	console.log('hello!');

	markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');
		const width = utils.getAttr(token.attrs, 'width');
		const height = utils.getAttr(token.attrs, 'height');
		console.log(token.attrs);

		// const imageRegex = /<img(.*?)src=["'](.*?)["'](.*?)>/gi;

		console.log({src, split: src.split('%7C')});
		// if (src.match(imageRegex)) {
		// 	console.log('match!')
		// }

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) {
			return defaultRender(tokens, idx, options, env, self);
		}

		const r = utils.imageReplacement(src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r) return `<img data-from-md ${htmlUtils.attributesHtml(Object.assign({}, r, { title, width, height }))}/>`;

		return defaultRender(tokens, idx, options, env, self);
	};
	markdownIt.renderer.rules.foooooo = (tokens, idx, options, env, self) => {

		console.log('in fooooo');
		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
