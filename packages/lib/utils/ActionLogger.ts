import Logger from '@joplin/utils/Logger';

type DescriptionRecord = {
	readonly label: string;

	// Where the label was added
	readonly from: string;
};

const logger = Logger.create('UserItemAction');

export enum ItemActionType {
	Delete = 'delete',
	BatchDelete = 'batchDelete',
}

export default class ActionLogger {
	private descriptions: DescriptionRecord[] = [];

	private constructor(private source: string) { }

	public clone() {
		const clone = new ActionLogger(this.source);
		clone.descriptions = [...this.descriptions];
		return clone;
	}

	// addDescription is used to add labels with information that may not be available
	// when .log is called. For example, to include the title of a deleted note.
	public addDescription(source: string, description: string) {
		this.descriptions.push({ label: description, from: source });
	}

	public log(action: ItemActionType, itemIds: string|string[]) {
		const description = this.descriptions.map(description => {
			return `${JSON.stringify(description.label)} from ${description.from}`;
		});
		logger.info(`${JSON.stringify(action)} from ${this.source}: Description: ${description.join(',')}; Item IDs: ${JSON.stringify(itemIds)}`);
	}

	public static from(source: ActionLogger|string|undefined) {
		if (!source) {
			source = 'Unknown source';
		}

		if (typeof source === 'string') {
			return new ActionLogger(source);
		}

		return source;
	}
}
