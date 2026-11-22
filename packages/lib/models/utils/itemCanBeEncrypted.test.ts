import { ShareType, StateShare } from '../../services/share/reducer';
import itemCanBeEncrypted from './itemCanBeEncrypted';

const makeShare = (type: ShareType, masterKeyId: string): StateShare => ({ type, id: 'test', master_key_id: masterKeyId, folder_id: 'testing', note_id: '' });

describe('itemCanBeEncrypted', () => {
	test.each([
		{ label: 'items with share_id but no share', item: { share_id: 'test' }, share: null, expected: true },
		{ label: 'items in folder shares with a master key', item: { share_id: 'test' }, share: makeShare(ShareType.Folder, 'key'), expected: true },
		{ label: 'items in folder shares with master_key_id=""', item: { share_id: 'test' }, share: makeShare(ShareType.Folder, ''), expected: false },
		{ label: 'items whose share is not a folder share', item: { share_id: 'test' }, share: makeShare(ShareType.PublishedFolder, ''), expected: true },
		{ label: 'published items', item: { is_shared: 1 }, share: null, expected: false },
	])('should handle $label', ({ item, share, expected }) => {
		expect(itemCanBeEncrypted(item, share)).toBe(expected);
	});
});
