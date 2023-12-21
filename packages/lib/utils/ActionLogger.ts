import Logger from '@joplin/utils/Logger';

type DescriptionRecord = {
	readonly source: string;
	readonly description: string;
};

const logger = Logger.create('NoteActions');

export default class ActionLogger {
	private descriptions: DescriptionRecord[] = [];

	public constructor(private source: string) { }

	public clone() {
		const clone = new ActionLogger(this.source);
		clone.descriptions = [...this.descriptions];
		return clone;
	}

	public addDescription(source: string, description: string) {
		this.descriptions.push({ source, description });
	}

	public log(action: string, itemIds: string|string[]) {
		const description = this.descriptions.map(description => {
			return `${description.description} (${description.source})`;
		}).join('; ');

		logger.info(JSON.stringify({
			action, description, ids: itemIds, from: this.source,
		}));
	}

	public static from(source: ActionLogger|string) {
		if (!source) {
			throw new Error('ActionLogger: Missing source');
		}

		if (typeof source === 'string') {
			return new ActionLogger(source);
		}

		return source;
	}
}
