import { ModelType } from '../../../BaseModel';
import BaseItem from '../../../models/BaseItem';
import Folder from '../../../models/Folder';
import Note from '../../../models/Note';
import NoteResource from '../../../models/NoteResource';
import itemCanBeEncrypted from '../../../models/utils/itemCanBeEncrypted';
import { PlaintextUploadConfirmation } from '../../../models/utils/checkPlaintextUploadConfirmed';
import { _, _n } from '../../../locale';
import { quoteUntrustedText } from '../../../string-utils';
import { BaseItemEntity, FolderEntity, NoteEntity } from '../../database/types';
import { StateShare } from '../../share/reducer';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
import mustConfirmPlaintextUploads from './mustConfirmPlaintextUploads';
import { reg } from '../../../registry';
import { Dispatch } from 'redux';
import checkDisabledSyncItemsNotification from './checkDisabledSyncItemsNotification';

export enum PlaintextUploadReason {
	Published = 'published',
	UnencryptedShare = 'unencryptedShare',
	// The share isn't in the local share state, so the item can't be checked and stays held back
	UnknownShare = 'unknownShare',
	// The item would now be uploaded encrypted, or E2EE was disabled, so the next upload step releases it
	None = 'none',
}

export interface HeldBackItem {
	id: string;
	type_: ModelType;
	title: string;
	typeLabel: string;
	// The version a confirmation covers
	updatedTime: number;
}

export enum PublishedItemGroup {
	IndividuallyPublishedNotes = 'individuallyPublishedNotes',
	AttachmentsOfIndividuallyPublishedNotes = 'attachmentsOfIndividuallyPublishedNotes',
	PublishedFolder = 'publishedFolder',
	// An encrypted or missing ancestor could be a further published folder, so these items can't be placed
	EncryptedAncestor = 'encryptedAncestor',
	MissingAncestor = 'missingAncestor',
	UnlinkedAttachments = 'unlinkedAttachments',
}

export interface HeldBackItemGroup {
	// Unique among the groups. An attachment can be listed in more than one group.
	key: string;
	reason: PlaintextUploadReason;
	// Set for UnencryptedShare only
	shareId: string;
	// Set for Published only
	publishedGroup: PublishedItemGroup|null;
	// Set for PublishedFolder only
	rootFolderId: string;
	label: string;
	items: HeldBackItem[];
}

export const getPlaintextUploadReason = (item: BaseItemEntity, shares: StateShare[]) => {
	if (item.is_shared) return PlaintextUploadReason.Published;
	if (!item.share_id) return PlaintextUploadReason.None;

	const share = shares.find(s => s.id === item.share_id);
	if (!share) return PlaintextUploadReason.UnknownShare;
	return itemCanBeEncrypted(item, share) ? PlaintextUploadReason.None : PlaintextUploadReason.UnencryptedShare;
};

const loadItemsForListing = async (idsByType: Map<ModelType, string[]>) => {
	const output: BaseItemEntity[] = [];
	for (const [itemType, ids] of idsByType) {
		const fieldNames = BaseItem.getClassByItemType(itemType).fieldNames();
		// Skips base_body, since note bodies can be large
		const fields = ['id', 'title', 'parent_id', 'is_shared', 'share_id', 'updated_time'].filter(field => fieldNames.includes(field));
		const items: BaseItemEntity[] = await BaseItem.loadItemsByTypeAndIds(itemType, ids, { fields });
		output.push(...items.map(item => ({ ...item, type_: itemType })));
	}
	return output;
};

export const loadPlaintextUploadHeldBackItems = async (syncTargetId: number) => {
	const idsByType = new Map<ModelType, string[]>();
	for (const syncItem of await BaseItem.plaintextUploadHeldBackSyncItems(syncTargetId)) {
		let ids = idsByType.get(syncItem.item_type);
		if (!ids) {
			ids = [];
			idsByType.set(syncItem.item_type, ids);
		}
		ids.push(syncItem.item_id);
	}
	return loadItemsForListing(idsByType);
};

const typeLabel = (type: ModelType) => {
	if (type === ModelType.Folder) return _('Notebook');
	if (type === ModelType.Note) return _('Note');
	if (type === ModelType.Resource) return _('Attachment');
	if (type === ModelType.Tag) return _('Tag');
	return _('Item');
};

const reasonOrder = [PlaintextUploadReason.Published, PlaintextUploadReason.UnencryptedShare, PlaintextUploadReason.UnknownShare, PlaintextUploadReason.None];
const publishedGroupOrder = [PublishedItemGroup.IndividuallyPublishedNotes, PublishedItemGroup.AttachmentsOfIndividuallyPublishedNotes, PublishedItemGroup.PublishedFolder, PublishedItemGroup.EncryptedAncestor, PublishedItemGroup.MissingAncestor, PublishedItemGroup.UnlinkedAttachments];
const typeOrder = [ModelType.Folder, ModelType.Note, ModelType.Resource];

type FolderForPlacement = Pick<FolderEntity, 'id' | 'title' | 'parent_id' | 'is_shared' | 'encryption_applied'>;

interface Placement {
	group: PublishedItemGroup;
	rootFolder: FolderForPlacement|null;
}

// Only uses local data, so that the server's list of shares can't move an item into another group. The root is the
// furthest published folder, since publishing a folder publishes everything in it.
const placePublishedNoteOrFolder = (item: NoteEntity|FolderEntity, folders: Map<string, FolderForPlacement>): Placement => {
	let rootFolder = item.type_ === ModelType.Folder ? folders.get(item.id) ?? null : null;
	const visited = new Set<string>([item.id]);

	let group: PublishedItemGroup|null = null;
	let parent;
	for (
		let parentId = item.parent_id;
		parentId && !visited.has(parentId);
		parentId = parent.parent_id
	) {
		visited.add(parentId);
		parent = folders.get(parentId);
		if (!parent) {
			group = PublishedItemGroup.MissingAncestor;
			rootFolder = null;
			break;
		}
		if (parent.encryption_applied) {
			group = PublishedItemGroup.EncryptedAncestor;
			rootFolder = null;
			break;
		}
		if (parent.is_shared) {
			rootFolder = parent;
		}
	}

	if (!group) {
		group = rootFolder ? PublishedItemGroup.PublishedFolder : PublishedItemGroup.IndividuallyPublishedNotes;
	}
	return { group, rootFolder };
};

// Attachments are placed by the notes that published them: propagation sets is_shared from note_resources, not from
// the note bodies.
const placePublishedItems = async (items: BaseItemEntity[]) => {
	const output = new Map<string, Placement[]>();
	if (!items.length) return output;

	const folders = new Map<string, FolderForPlacement>();
	const loadedFolders: FolderForPlacement[] = await Folder.all({ fields: ['id', 'title', 'parent_id', 'is_shared', 'encryption_applied'] });
	for (const folder of loadedFolders) folders.set(folder.id, folder);

	const resourceIds = items.filter(item => item.type_ === ModelType.Resource).map(item => item.id);
	const linkingNotes = await NoteResource.associatedResourceNotes(resourceIds, { fields: ['note_id', 'parent_id', 'is_shared', 'encryption_applied'] });

	for (const item of items) {
		if (item.type_ !== ModelType.Resource) {
			output.set(item.id, [placePublishedNoteOrFolder(item, folders)]);
			continue;
		}

		const placements = new Map<string, Placement>();
		for (const note of linkingNotes[item.id] ?? []) {
			if (!note.is_shared || note.encryption_applied) continue;
			const placement = placePublishedNoteOrFolder({ id: note.note_id, type_: ModelType.Note, parent_id: note.parent_id }, folders);
			if (placement.group === PublishedItemGroup.IndividuallyPublishedNotes) placement.group = PublishedItemGroup.AttachmentsOfIndividuallyPublishedNotes;
			placements.set(`${placement.group}:${placement.rootFolder?.id ?? ''}`, placement);
		}
		output.set(item.id, placements.size ? [...placements.values()] : [{ group: PublishedItemGroup.UnlinkedAttachments, rootFolder: null }]);
	}

	return output;
};

const publishedGroupLabel = ({ group, rootFolder }: Placement) => {
	if (group === PublishedItemGroup.IndividuallyPublishedNotes) return _('Published note');
	if (group === PublishedItemGroup.AttachmentsOfIndividuallyPublishedNotes) return _('Attachment of a published note');
	if (group === PublishedItemGroup.PublishedFolder) return _('In published notebook %s', rootFolder.title ? quoteUntrustedText(rootFolder.title) : _('Untitled'));
	if (group === PublishedItemGroup.EncryptedAncestor) return _('Published, in a notebook that hasn\'t been decrypted yet');
	if (group === PublishedItemGroup.MissingAncestor) return _('Published, in a notebook that hasn\'t been downloaded yet');
	return _('Published attachment, not linked from a published note');
};

const groupLabel = async (reason: PlaintextUploadReason, share: StateShare|null) => {
	if (reason === PlaintextUploadReason.UnencryptedShare) {
		// The share root's title is empty while the folder is encrypted
		const root = share.folder_id ? await Folder.load(share.folder_id, { fields: ['id', 'title', 'encryption_applied'] }) : null;
		return root && !root.encryption_applied && root.title ? _('In notebook %s, shared without encryption', quoteUntrustedText(root.title)) : _('In a notebook shared without encryption');
	}
	if (reason === PlaintextUploadReason.UnknownShare) return _('In a shared notebook');
	return _('Will be uploaded on the next sync');
};

const toHeldBackItem = (item: BaseItemEntity): HeldBackItem => ({
	id: item.id,
	type_: item.type_,
	title: (item as NoteEntity).title || '',
	typeLabel: typeLabel(item.type_),
	updatedTime: item.updated_time,
});

const sortHeldBackItems = (items: HeldBackItem[]) => {
	const typeIndex = (type: ModelType) => {
		const index = typeOrder.indexOf(type);
		return index >= 0 ? index : typeOrder.length;
	};
	items.sort((a, b) => typeIndex(a.type_) - typeIndex(b.type_) || a.title.localeCompare(b.title));
};

export const loadPlaintextUploadHeldBackItemGroups = async (syncTargetId: number, shares: StateShare[]) => {
	const groups = new Map<string, HeldBackItemGroup>();
	const items = await loadPlaintextUploadHeldBackItems(syncTargetId);
	const reasons = new Map(items.map(item => [item.id, mustConfirmPlaintextUploads() ? getPlaintextUploadReason(item, shares) : PlaintextUploadReason.None]));
	const placements = await placePublishedItems(items.filter(item => reasons.get(item.id) === PlaintextUploadReason.Published));

	for (const item of items) {
		const reason = reasons.get(item.id);
		const shareId = reason === PlaintextUploadReason.UnencryptedShare ? item.share_id : '';

		for (const placement of placements.get(item.id) ?? [null]) {
			const rootFolderId = placement?.rootFolder?.id ?? '';
			const key = placement ? `${reason}:${placement.group}:${rootFolderId}` : `${reason}:${shareId}`;

			let group = groups.get(key);
			if (!group) {
				const share = shareId ? shares.find(s => s.id === shareId) : null;
				const label = placement ? publishedGroupLabel(placement) : await groupLabel(reason, share);
				group = { key, reason, shareId, publishedGroup: placement?.group ?? null, rootFolderId, label, items: [] };
				groups.set(key, group);
			}

			group.items.push(toHeldBackItem(item));
		}
	}

	const output = [...groups.values()];
	for (const group of output) sortHeldBackItems(group.items);
	output.sort((a, b) => {
		return reasonOrder.indexOf(a.reason) - reasonOrder.indexOf(b.reason)
			|| publishedGroupOrder.indexOf(a.publishedGroup) - publishedGroupOrder.indexOf(b.publishedGroup)
			|| a.label.localeCompare(b.label);
	});
	return output;
};

// Items that would be uploaded encrypted anyway are left out, so that confirming doesn't cover them if they're moved
// back into a share or publication before the upload step
export const heldBackItemsToConfirm = (groups: HeldBackItemGroup[]) => {
	const items = new Map<string, HeldBackItem>();
	for (const group of groups) {
		if (group.reason === PlaintextUploadReason.None) continue;
		for (const item of group.items) items.set(item.id, item);
	}
	return [...items.values()];
};

// Attachments can't be bound to a version here, since they only get is_shared, and a new updated_time, when the sync
// starts.
export const newlyPublishedConfirmations = async (noteIds: string[], attachmentIds: string[]): Promise<PlaintextUploadConfirmation[]> => {
	const notes: NoteEntity[] = await Note.byIds(noteIds, { fields: ['id', 'updated_time'] });
	return [
		...notes.map(note => ({ id: note.id, updatedTime: note.updated_time })),
		...attachmentIds.map(id => ({ id, updatedTime: null as number|null })),
	];
};

export interface PlaintextUploadHeldBackCauses {
	published: boolean;
	unencryptedShare: boolean;
	shareRootTitle: string;
}

export const loadPlaintextUploadHeldBackCauses = async (syncTargetId: number, shares: StateShare[], itemIds: string[]): Promise<PlaintextUploadHeldBackCauses> => {
	const ids = new Set(itemIds);
	const groups = (await loadPlaintextUploadHeldBackItemGroups(syncTargetId, shares))
		.filter(group => group.reason !== PlaintextUploadReason.None && group.items.some(item => ids.has(item.id)));
	const shareGroups = groups.filter(group => group.reason !== PlaintextUploadReason.Published);
	const shareIds = new Set(shareGroups.map(group => group.shareId));
	const share = shareIds.size === 1 ? shares.find(s => s.id === [...shareIds][0]) : null;
	const root = share?.folder_id ? await Folder.load(share.folder_id, { fields: ['id', 'title', 'encryption_applied'] }) : null;
	return {
		published: groups.length > shareGroups.length,
		unencryptedShare: shareGroups.length > 0,
		shareRootTitle: root && !root.encryption_applied ? root.title : '',
	};
};

const allowUnencryptedUploadsMessage = (causes: PlaintextUploadHeldBackCauses) => {
	const turnOffHint = _('Allow this on this device? You can turn it off in Settings > Synchronisation.');
	if (causes.published && causes.unencryptedShare) {
		return [
			_('Allow unencrypted uploads?'),
			`${_('Published notes, and notebooks shared with you without end-to-end encryption, can only be uploaded unencrypted.')} ${turnOffHint}`,
		];
	}
	if (causes.unencryptedShare) {
		const sharedWithoutEncryption = causes.shareRootTitle
			? _('%s was shared with you without end-to-end encryption, so your changes to it can only be uploaded unencrypted.', quoteUntrustedText(causes.shareRootTitle))
			: _('Some notebooks were shared with you without end-to-end encryption, so your changes to them can only be uploaded unencrypted.');
		return [
			_('Upload changes to notebooks shared without encryption?'),
			`${sharedWithoutEncryption} ${turnOffHint}`,
		];
	}
	return [
		_('Allow publishing with end-to-end encryption on?'),
		`${_('Published notes and their attachments are uploaded without encryption, so that they can be viewed on the web.')} ${turnOffHint}`,
	];
};

export const onAllowUnencryptedUploads = async (causes: PlaintextUploadHeldBackCauses) => {
	if (await shim.showConfirmationDialog(allowUnencryptedUploadsMessage(causes).join('\n\n'))) {
		Setting.setValue('encryption.allowUnencryptedUploads', true);
		void reg.waitForSyncFinishedThenSync();
	}
};

export const onKeepHeldBackChanges = async (itemIds: string[], causes: PlaintextUploadHeldBackCauses, dispatch: Dispatch) => {
	if (await shim.showConfirmationDialog(causes.unencryptedShare && !causes.published
		? _('These changes, and later changes to the same notes, will stay on this device. Other people in the shared notebook won\'t see them. To upload them, enable "Allow unencrypted uploads when end-to-end encryption is on" in Settings > Synchronisation.')
		: _('These changes, and later changes to the same notes, will stay on this device. To upload them, enable "Allow unencrypted uploads when end-to-end encryption is on" in Settings > Synchronisation.'),
	)) {
		await BaseItem.ignorePlaintextUploadHeldBackItems(Setting.value('sync.target'), itemIds);
		await checkDisabledSyncItemsNotification(dispatch);
	}
};

// Titles are quoted, so that they can't start a new line or pass for other text. "Untitled" isn't, so that it can't be
// mistaken for a title.
const displayTitle = (title: string) => {
	return title ? quoteUntrustedText(title) : _('Untitled');
};

// For plain-text lists, such as in the CLI
export const heldBackItemToLine = (item: HeldBackItem) => {
	return `${item.typeLabel}: ${displayTitle(item.title)} (${item.id})`;
};

export const plaintextUploadBannerMessage = (count: number, causes: PlaintextUploadHeldBackCauses) => {
	if (causes.published && causes.unencryptedShare) {
		return _n(
			'%d change wasn\'t uploaded because it would be sent without encryption.',
			'%d changes weren\'t uploaded because they would be sent without encryption.',
			count, count,
		);
	}
	if (causes.unencryptedShare) {
		return _n(
			'%d change to a notebook shared without encryption wasn\'t uploaded.',
			'%d changes to notebooks shared without encryption weren\'t uploaded.',
			count, count,
		);
	}
	return _n(
		'Publishing is turned off while end-to-end encryption is on: %d change wasn\'t uploaded.',
		'Publishing is turned off while end-to-end encryption is on: %d changes weren\'t uploaded.',
		count, count,
	);
};

export const plaintextUploadFaqUrl = 'https://joplinapp.org/help/faq#how-can-i-publish-notes-with-end-to-end-encryption-turned-on';
