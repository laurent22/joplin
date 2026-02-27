import { ItemId, ResourceData } from './types';
import Serializable, { BaseSchema } from './Serializable';

interface InitializationOptions extends ResourceData {
	referencedBy: ItemId[];
}

const schema = {
	isResource: 'boolean',
	id: 'id',
	title: 'string',
	mimeType: 'string',
	referencedBy: 'id[]',
} satisfies BaseSchema;

export default class ResourceRecord extends Serializable<typeof schema> implements ResourceData {
	public readonly parentId: undefined;
	public readonly id: ItemId;
	public readonly title: string;
	public readonly mimeType: string;
	public readonly referencedBy: readonly ItemId[] = [];

	public constructor(options: InitializationOptions) {
		super(schema);

		this.id = options.id;
		this.title = options.title;
		this.mimeType = options.mimeType;
		this.referencedBy = [...options.referencedBy];
	}

	public static fromSerialized(serialized: unknown) {
		const data = ResourceRecord.deserialize(schema, serialized);
		return new ResourceRecord(data);
	}

	public serialize() {
		return {
			isResource: true,
			id: this.id,
			title: this.title,
			referencedBy: [...this.referencedBy],
			mimeType: this.mimeType,
		};
	}

	public get referenceCount() {
		return this.referencedBy.length;
	}

	public withReference(noteId: ItemId) {
		if (this.referencedBy.includes(noteId)) {
			return this;
		}
		return new ResourceRecord({
			id: this.id,
			title: this.title,
			mimeType: this.mimeType,
			referencedBy: [...this.referencedBy, noteId],
		});
	}

	public withoutReference(noteId: ItemId) {
		if (this.referencedBy.includes(noteId)) {
			return this;
		}

		return new ResourceRecord({
			id: this.id,
			title: this.title,
			mimeType: this.mimeType,
			referencedBy: this.referencedBy.filter(ref => ref !== noteId),
		});
	}
}
