import type { ItemId, NoteData } from './types';
import Serializable, { BaseSchema } from './Serializable';

interface InitializationOptions extends NoteData {
}

const schema = {
	isNote: 'boolean',
	parentId: 'id',
	id: 'id',
	title: 'string',
	body: 'string',
	published: 'boolean',
} satisfies BaseSchema;

export default class NoteRecord extends Serializable<typeof schema> implements NoteData {
	public readonly parentId: ItemId;
	public readonly id: ItemId;
	public readonly title: string;
	public readonly body: string;
	public readonly published: boolean;

	public constructor(options: InitializationOptions) {
		super(schema);

		this.parentId = options.parentId;
		this.id = options.id;
		this.title = options.title;
		this.body = options.body;
		this.published = options.published;
	}

	public static fromSerialized(serialized: unknown) {
		const data = this.deserialize(schema, serialized);
		return new NoteRecord(data);
	}

	public serialize() {
		return {
			isNote: true,
			parentId: this.parentId,
			id: this.id,
			title: this.title,
			body: this.body,
			published: this.published,
		};
	}

	public withBody(body: string) {
		return new NoteRecord({
			...this.serialize(),
			body,
		});
	}

	public withTitle(title: string) {
		return new NoteRecord({
			...this.serialize(),
			title,
		});
	}

	public withParent(parentId: ItemId) {
		return new NoteRecord({
			...this.serialize(),
			parentId,
		});
	}

	public withPublished(published: boolean) {
		return new NoteRecord({
			...this.serialize(),
			published,
		});
	}
}
