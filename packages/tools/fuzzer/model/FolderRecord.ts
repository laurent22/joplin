import { strict as assert } from 'node:assert';
import type { FolderData, ItemId } from '../types';

export type ShareRecord = {
	email: string;
	readOnly: boolean;
};

interface InitializationOptions extends FolderData {
	childIds: readonly ItemId[];
	sharedWith: readonly ShareRecord[];
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
	public readonly childIds: readonly ItemId[];

	private readonly isShared_: boolean;
	private readonly sharedWith_: readonly ShareRecord[];

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
		return this.isShared_ && this.parentId === '';
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

	public withChildren(childIds: readonly ItemId[]) {
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

	private withShareState_(isShared: boolean, shareState: readonly ShareRecord[]) {
		return new FolderRecord({
			...this.metadata_,
			isShared,
			sharedWith: [...shareState],
		});
	}

	public withShareOwner(email: string) {
		if (email === this.ownedByEmail) return this;

		const sharedWith = this.metadata_.sharedWith.filter(recipient => recipient.email !== email);
		return new FolderRecord({
			...this.metadata_,
			sharedWith: sharedWith,
			isShared: sharedWith.length > 0,
			ownedByEmail: email,
		});
	}

	public withShared(recipientEmail: string, readOnly: boolean) {
		if (this.isSharedWith(recipientEmail) && this.isReadOnlySharedWith(recipientEmail) === readOnly) {
			return this;
		}

		if (this.parentId !== '') {
			throw new Error('Cannot share non-top-level folder');
		}

		return this.withShareState_(true, [
			...this.sharedWith_.filter(record => record.email !== recipientEmail),
			{ email: recipientEmail, readOnly },
		]);
	}

	public withRemovedFromShare(recipientEmail: string) {
		if (!this.isSharedWith(recipientEmail)) {
			return this;
		}

		return this.withShareState_(
			// Even if no users are present in the share, Joplin still considers the folder to be shared
			this.isShared_,
			this.sharedWith_.filter(record => record.email !== recipientEmail),
		);
	}

	public withUnshared() {
		if (!this.isShared_) {
			return this;
		}

		return this.withShareState_(false, []);
	}
}
