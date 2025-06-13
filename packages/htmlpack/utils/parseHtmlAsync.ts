const htmlparser2 = require('@joplin/fork-htmlparser2');

export type HtmlAttrs = Record<string, string>;

interface Callbacks {
	onopentag: (name: string, attrs: HtmlAttrs)=> Promise<void>;
	ontext: (text: string)=> Promise<void>;
	onclosetag: (name: string)=> Promise<void>;
}

enum EventTypes {
	OpenTag,
	Text,
	CloseTag,
}

interface OpenTagEvent {
	type: EventTypes.OpenTag;
	name: string;
	attrs: HtmlAttrs;
}

interface TextEvent {
	type: EventTypes.Text;
	decodedText: string;
}

interface CloseTagEvent {
	type: EventTypes.CloseTag;
	name: string;
}

type ParserEvent = OpenTagEvent|TextEvent|CloseTagEvent;

const parseHtmlAsync = async (html: string, callbacks: Callbacks) => {
	const events: ParserEvent[] = [];
	const parser = new htmlparser2.Parser({
		onopentag: (name: string, attrs: HtmlAttrs) => {
			events.push({
				type: EventTypes.OpenTag,
				name,
				attrs,
			});
		},

		ontext: (decodedText: string) => {
			events.push({
				type: EventTypes.Text,
				decodedText,
			});
		},

		onclosetag: (name: string) => {
			events.push({
				type: EventTypes.CloseTag,
				name,
			});
		},

	}, { decodeEntities: true });

	parser.write(html);
	parser.end();

	for (const event of events) {
		if (event.type === EventTypes.OpenTag) {
			await callbacks.onopentag(event.name, event.attrs);
		} else if (event.type === EventTypes.CloseTag) {
			await callbacks.onclosetag(event.name);
		} else if (event.type === EventTypes.Text) {
			await callbacks.ontext(event.decodedText);
		} else {
			const exhaustivenessCheck: never = event;
			throw new Error(`Unknown event type: ${exhaustivenessCheck}`);
		}
	}
};

export default parseHtmlAsync;
