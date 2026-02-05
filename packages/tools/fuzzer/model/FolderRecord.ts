import { strict as assert } from 'node:assert';
import type { FolderData, ItemId } from '../types';

export type ShareRecord = {
	email: string;
	readOnly: boolean;
};

interface InitializationOptions extends FolderData {
	childIds: ItemId[];
	sharedWith: ShareRecord[];
	isShared: boolean;
	// Email of the Joplin Server account that controls the item
	ownedByEmail: string;
}

const validateId = (id: string) => {
	return !!id.match(/^[a-zA-Z0-9]{32}$/);
};

export default class FolderRecord implements FolderData {
	public readonly parentId: ItemId;
	public readonly id: ItemId;
	public readonly title: string;
	public readonly ownedByEmail: string;
	public readonly childIds: ItemId[];

	// Only valid for root folders. Note that a separate isShared_ is needed
	// because Joplin folders can be 'shared' even if there are no share recipients.
	private readonly isShared_: boolean;
	private readonly sharedWith_: ShareRecord[];

	public constructor(options: InitializationOptions) {
		this.parentId = options.parentId;
		this.id = options.id;
		this.title = options.title;
		this.childIds = options.childIds;
		this.isShared_ = options.isShared ?? options.sharedWith.length > 0;
		this.ownedByEmail = options.ownedByEmail;
		this.sharedWith_ = options.sharedWith;

		if (this.parentId !== '' && !validateId(this.parentId)) {
			throw new Error(`Invalid parent ID: ${this.parentId}`);
		}

		if (!validateId(this.id)) {
			throw new Error(`Invalid ID: ${this.id}`);
		}
	}

	public get shareRecipients() {
		return this.sharedWith_.map(sharee => sharee.email);
	}

	private get metadata_(): InitializationOptions {
		return {
			parentId: this.parentId,
			id: this.id,
			title: this.title,
			isShared: this.isShared_,
			ownedByEmail: this.ownedByEmail,
			childIds: [...this.childIds],
			sharedWith: [...this.sharedWith_],
		};
	}

	public get isRootSharedItem() {
		return this.isShared_;
	}

	public isSharedWith(email: string) {
		assert.equal(this.parentId, '', 'only supported for toplevel folders');
		return this.sharedWith_.some(record => record.email === email);
	}

	public isReadOnlySharedWith(email: string) {
		assert.equal(this.parentId, '', 'only supported for toplevel folders');
		return this.sharedWith_.some(record => record.email === email && record.readOnly);
	}

	public withTitle(title: string) {
		return new FolderRecord({
			...this.metadata_,
			title,
		});
	}

	public withParent(parentId: ItemId) {
		return new FolderRecord({
			...this.metadata_,
			parentId,
		});
	}

	public withId(id: ItemId) {
		return new FolderRecord({
			...this.metadata_,
			id,
		});
	}

	public withChildren(childIds: ItemId[]) {
		return new FolderRecord({
			...this.metadata_,
			childIds: [...childIds],
		});
	}

	public withChildAdded(childId: ItemId) {
		if (this.childIds.includes(childId)) {
			return this;
		}

		return this.withChildren([...this.childIds, childId]);
	}

	public withChildRemoved(childId: ItemId) {
		return this.withChildren(
			this.childIds.filter(id => id !== childId),
		);
	}

	public withShared(recipientEmail: string, readOnly: boolean) {
		if (this.isSharedWith(recipientEmail) && this.isReadOnlySharedWith(recipientEmail) === readOnly) {
			return this;
		}

		if (this.parentId !== '') {
			throw new Error('Cannot share non-top-level folder');
		}

		return new FolderRecord({
			...this.metadata_,
			isShared: true,
			sharedWith: [
				...this.sharedWith_.filter(record => record.email !== recipientEmail),
				{ email: recipientEmail, readOnly },
			],
		});
	}

	public withRemovedFromShare(recipientEmail: string) {
		if (!this.isSharedWith(recipientEmail)) {
			return this;
		}

		return new FolderRecord({
			...this.metadata_,
			sharedWith: this.sharedWith_.filter(record => record.email !== recipientEmail),
		});
	}

	public withUnshared() {
		if (!this.isShared_) {
			return this;
		}

		return new FolderRecord({
			...this.metadata_,
			sharedWith: [],
			isShared: false,
		});
	}
}
