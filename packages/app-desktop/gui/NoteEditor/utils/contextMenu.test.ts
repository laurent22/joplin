import { ContextMenuItemType } from '@joplin/lib/services/plugins/api/types';
import { ContextMenuOptions } from './contextMenuUtils';

// We need to mock some dependencies before importing menuItems
jest.mock('@joplin/lib/services/ResourceEditWatcher/index', () => ({}));
jest.mock('@joplin/lib/models/Resource', () => ({
	default: { load: jest.fn(), fullPath: jest.fn() },
	resourceOcrStatusToString: jest.fn(),
}));
jest.mock('@joplin/lib/models/BaseItem', () => ({
	default: { loadItemById: jest.fn(), syncShareCache: {} },
}));
jest.mock('@joplin/lib/BaseModel', () => ({
	default: { TYPE_NOTE: 1, TYPE_RESOURCE: 4 },
	ModelType: { Resource: 4, Note: 1 },
}));
jest.mock('@joplin/lib/models/Setting', () => ({
	default: { value: jest.fn() },
}));
jest.mock('@joplin/lib/models/ItemChange', () => ({
	default: { SOURCE_UNSPECIFIED: 0 },
}));
jest.mock('@joplin/lib/shim', () => ({
	default: { showErrorDialog: jest.fn(), showMessageBox: jest.fn(), fsDriver: jest.fn() },
	MessageBoxType: { Error: 'error' },
}));
jest.mock('@joplin/lib/services/ExternalEditWatcher/utils', () => ({
	openFileWithExternalEditor: jest.fn(),
}));
jest.mock('@joplin/lib/services/CommandService', () => ({
	default: { instance: () => ({ execute: jest.fn() }) },
}));
jest.mock('@joplin/lib/SyncTargetRegistry', () => ({
	default: { isJoplinServerOrCloud: jest.fn() },
}));
jest.mock('@joplin/lib/models/utils/readOnly', () => ({
	itemIsReadOnlySync: jest.fn(),
}));
jest.mock('../../../services/bridge', () => {
	const Menu = jest.fn();
	const MenuItem = jest.fn();
	return {
		default: () => ({
			Menu: Menu,
			MenuItem: MenuItem,
			showSaveDialog: jest.fn(),
			showItemInFolder: jest.fn(),
			showErrorMessageBox: jest.fn(),
			showInfoMessageBox: jest.fn(),
			activeWindow: () => ({ webContents: { paste: jest.fn() } }),
			createImageFromPath: jest.fn(),
		}),
	};
});
jest.mock('@joplin/lib/locale', () => ({
	_: (s: string, ...args: string[]) => [s, ...args].join(' '),
}));
jest.mock('./clipboardUtils', () => ({
	copyHtmlToClipboard: jest.fn(),
}));

import { menuItems } from './contextMenu';

const createMockOptions = (overrides: Partial<ContextMenuOptions> = {}): ContextMenuOptions => ({
	itemType: ContextMenuItemType.None,
	resourceId: '',
	isNoteLink: false,
	mime: '',
	filename: '',
	linkToOpen: '',
	linkToCopy: '',
	textToCopy: '',
	htmlToCopy: '',
	insertContent: jest.fn(),
	isReadOnly: false,
	fireEditorEvent: jest.fn(),
	htmlToMd: null,
	mdToHtml: null,
	...overrides,
});

describe('contextMenu - isActive predicates', () => {
	const dispatch = jest.fn();
	let items: ReturnType<typeof menuItems>;

	beforeEach(() => {
		items = menuItems(dispatch);
	});

	describe('note link context menu (isNoteLink = true)', () => {
		const noteLinkOptions = createMockOptions({
			itemType: ContextMenuItemType.Resource,
			resourceId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
			isNoteLink: true,
		});

		it('should NOT show saveAs for note links', () => {
			expect(items.saveAs.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});

		it('should NOT show revealInFolder for note links', () => {
			expect(items.revealInFolder.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});

		it('should NOT show recognizeHandwrittenImage for note links', () => {
			expect(items.recognizeHandwrittenImage.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});

		it('should NOT show copyOcrText for note links', () => {
			expect(items.copyOcrText.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});

		it('should NOT show createAccessibleDocument for note links', () => {
			expect(items.createAccessibleDocument.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});

		it('should NOT show copyPathToClipboard for note links', () => {
			expect(items.copyPathToClipboard.isActive(noteLinkOptions.itemType, noteLinkOptions)).toBe(false);
		});
	});

	describe('resource link context menu (isNoteLink = false)', () => {
		const resourceOptions = createMockOptions({
			itemType: ContextMenuItemType.Resource,
			resourceId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
			isNoteLink: false,
		});

		it('should show saveAs for resource links', () => {
			expect(items.saveAs.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});

		it('should show revealInFolder for resource links', () => {
			expect(items.revealInFolder.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});

		it('should show recognizeHandwrittenImage for resource links', () => {
			expect(items.recognizeHandwrittenImage.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});

		it('should show copyOcrText for resource links', () => {
			expect(items.copyOcrText.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});

		it('should show createAccessibleDocument for resource links', () => {
			expect(items.createAccessibleDocument.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});

		it('should show copyPathToClipboard for resource links', () => {
			expect(items.copyPathToClipboard.isActive(resourceOptions.itemType, resourceOptions)).toBe(true);
		});
	});

	describe('image context menu (isNoteLink = false)', () => {
		const imageOptions = createMockOptions({
			itemType: ContextMenuItemType.Image,
			resourceId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
			isNoteLink: false,
		});

		it('should show saveAs for images', () => {
			expect(items.saveAs.isActive(imageOptions.itemType, imageOptions)).toBe(true);
		});

		it('should show revealInFolder for images', () => {
			expect(items.revealInFolder.isActive(imageOptions.itemType, imageOptions)).toBe(true);
		});

		it('should show copyPathToClipboard for images', () => {
			expect(items.copyPathToClipboard.isActive(imageOptions.itemType, imageOptions)).toBe(true);
		});

		it('should show copyImage for images', () => {
			expect(items.copyImage.isActive(imageOptions.itemType, imageOptions)).toBe(true);
		});
	});

	describe('external link context menu', () => {
		const externalLinkOptions = createMockOptions({
			itemType: ContextMenuItemType.Link,
			linkToOpen: 'https://example.com',
			linkToCopy: 'https://example.com',
			isNoteLink: false,
		});

		it('should show open for external links', () => {
			expect(items.open.isActive(externalLinkOptions.itemType, externalLinkOptions)).toBe(true);
		});

		it('should show copyLinkUrl for external links', () => {
			expect(items.copyLinkUrl.isActive(externalLinkOptions.itemType, externalLinkOptions)).toBe(true);
		});

		it('should NOT show saveAs for external links', () => {
			expect(items.saveAs.isActive(externalLinkOptions.itemType, externalLinkOptions)).toBe(false);
		});

		it('should NOT show revealInFolder for external links', () => {
			expect(items.revealInFolder.isActive(externalLinkOptions.itemType, externalLinkOptions)).toBe(false);
		});
	});
});
