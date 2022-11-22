import htmlUtils from '@joplin/renderer/htmlUtils';
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const htmlparser2 = require('@joplin/fork-htmlparser2');

export default (html: string, translations: Record<string, string>) => {
	const output: string[] = [];

	interface State {
		// When inside a block that needs to be translated, this array
		// accumulates the opening tags. For example, this text:
		//
		// <div translate>Hello <b>world</b></div>
		//
		// will have the tags ['div', 'b']
		//
		// This is used to track when we've processed all the content, including
		// HTML content, within a translatable block. Once that stack is empty,
		// we reached the end, and can translate the string that we got.
		translateStack: string[];

		// Keep a reference to the opening tag. For example in:
		//
		// <div translate>Hello <b>world</b></div>
		//
		// The opening tag is "div".
		currentTranslationTag: string[];

		// Once we finished processing the translable block, this will contain
		// the string to be translated. It may contain HTML.
		currentTranslationContent: string[];

		// Tells if we're at the beginning of a translable block.
		translateIsOpening: boolean;
	}

	const state: State = {
		translateStack: [],
		currentTranslationTag: [],
		currentTranslationContent: [],
		translateIsOpening: false,
	};

	const trimHtml = (content: string) => {
		return content
			.replace(/\n/g, '')
			.replace(/^(&tab;)+/i, '')
			.replace(/^(&nbsp;)+/i, '')
			.replace(/(&tab;)+$/i, '')
			.replace(/(&nbsp;)+$/i, '');
	};

	const pushContent = (state: State, content: string) => {
		if (state.translateStack.length) {
			if (state.translateIsOpening) {
				state.currentTranslationTag.push(content);
			} else {
				state.currentTranslationContent.push(content);
			}
		} else {
			output.push(content);
		}
	};

	const parser = new htmlparser2.Parser({

		onopentag: (name: string, attrs: any) => {
			if ('translate' in attrs) {
				if (state.translateStack.length) throw new Error(`Cannot have a translate block within another translate block. At tag "${name}" attrs: ${JSON.stringify(attrs)}`);
				state.translateStack.push(name);
				state.currentTranslationContent = [];
				state.currentTranslationTag = [];
				state.translateIsOpening = true;
			} else if (state.translateStack.length) {
				state.translateStack.push(name);
			}

			let attrHtml = htmlUtils.attributesHtml(attrs);
			if (attrHtml) attrHtml = ` ${attrHtml}`;
			const closingSign = htmlUtils.isSelfClosingTag(name) ? '/>' : '>';

			pushContent(state, `<${name}${attrHtml}${closingSign}`);
			state.translateIsOpening = false;
		},

		ontext: (decodedText: string) => {
			pushContent(state, htmlentities(decodedText));
		},

		onclosetag: (name: string) => {
			if (state.translateStack.length) {
				state.translateStack.pop();

				if (!state.translateStack.length) {
					const stringToTranslate = trimHtml(state.currentTranslationContent.join(''));
					const translation = translations[stringToTranslate] ? translations[stringToTranslate] : stringToTranslate;
					output.push(state.currentTranslationTag[0]);
					output.push(translation);
				}
			}

			if (htmlUtils.isSelfClosingTag(name)) return;
			pushContent(state, `</${name}>`);
		},

	}, { decodeEntities: true });

	parser.write(html);
	parser.end();

	return output.join('\n');
};
