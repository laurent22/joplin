import Logger from '@joplin/utils/Logger';

export enum ItemActionType {
	Delete = 'DeleteAction',
}

const actionTypeToLogger = {
	[ItemActionType.Delete]: Logger.create(ItemActionType.Delete),
};

export default class ActionLogger {
	private descriptions_: string[] = [];

	private constructor(private source: string) { }

	public clone() {
		const clone = new ActionLogger(this.source);
		clone.descriptions_ = [...this.descriptions_];
		return clone;
	}

	// addDescription is used to add labels with information that may not be available
	// when .log is called. For example, to include the title of a deleted note.
	public addDescription(description: string) {
		this.descriptions_.push(description);
	}

	public log(action: ItemActionType, itemIds: string|string[]) {
		if (!ActionLogger.enabled_) {
			return;
		}

		const logger = actionTypeToLogger[action];
		logger.info(`${this.source}: ${this.descriptions_.join(',')}; Item IDs: ${JSON.stringify(itemIds)}`);
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


	// Disabling the action logger globally can be useful on Joplin Server/Cloud
	// when many deletions are expected (e.g. for email-to-note).
	private static enabled_ = true;

	public static set enabled(v: boolean) {
		this.enabled_ = v;
	}

	public static get enabled() {
		return this.enabled_;
	}
}
