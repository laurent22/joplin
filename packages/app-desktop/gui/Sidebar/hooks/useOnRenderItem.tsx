import * as React from 'react';
import { DragEventHandler, MouseEventHandler, useCallback, useMemo, useRef } from 'react';
import { ItemClickListener, ItemDragListener, ListItem, ListItemType } from '../types';
import TagItem from '../listItemComponents/TagItem';
import { Dispatch } from 'redux';
import { clipboard } from 'electron';
import type { MenuItem as MenuItemType } from 'electron';
import { getTrashFolderId } from '@joplin/lib/services/trash';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import Tag from '@joplin/lib/models/Tag';
import { _ } from '@joplin/lib/locale';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import Folder from '@joplin/lib/models/Folder';
import bridge from '../../../services/bridge';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import { FolderEntity } from '@joplin/lib/services/database/types';
import InteropService from '@joplin/lib/services/interop/InteropService';
import InteropServiceHelper from '../../../InteropServiceHelper';
import Setting from '@joplin/lib/models/Setting';
import PerFolderSortOrderService from '../../../services/sortOrder/PerFolderSortOrderService';
import { getFolderCallbackUrl, getTagCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import FolderItem from '../listItemComponents/FolderItem';
import Logger from '@joplin/utils/Logger';
import onFolderDrop from '@joplin/lib/models/utils/onFolderDrop';
import HeaderItem from '../listItemComponents/HeaderItem';
import AllNotesItem from '../listItemComponents/AllNotesItem';
import ListItemWrapper, { ItemSelectionState } from '../listItemComponents/ListItemWrapper';
import { focus } from '@joplin/lib/utils/focusHandler';
import shim from '@joplin/lib/shim';
import useOnItemClick from './useOnItemClick';

const Menu = bridge().Menu;
const MenuItem: typeof MenuItemType = bridge().MenuItem;

const logger = Logger.create('useOnRenderItem');

interface Props {
	dispatch: Dispatch;
	themeId: number;
	plugins: PluginStates;
	folders: FolderEntity[];
	collapsedFolderIds: string[];
	containerRef: React.RefObject<HTMLDivElement>;

	selectedIndex: number;
	selectedIndexes: number[];
	listItems: ListItem[];
}

type ItemContextMenuListener = MouseEventHandler<HTMLElement>;

const menuUtils = new MenuUtils(CommandService.instance());

const focusListItem = (item: HTMLElement|null) => {
	if (item) {
		// Avoid scrolling to the selected item when refocusing the note list. Such a refocus
		// can happen if the note list rerenders and the selection is scrolled out of view and
		// can cause scroll to change unexpectedly.
		focus('useOnRenderItem', item, { preventScroll: true });
	}
};

const noFocusListItem = () => {};

const folderCommandToMenuItem = (commandId: string, folderIds: string|string[]) => {
	const options = Array.isArray(folderIds) ? { commandFolderIds: folderIds } : { commandFolderId: folderIds };
	return new MenuItem(menuUtils.commandToStatefulMenuItem(commandId, folderIds, options));
};

const useOnRenderItem = (props: Props) => {

	const pluginsRef = useRef<PluginStates>(null);
	pluginsRef.current = props.plugins;
	const foldersRef = useRef<FolderEntity[]>(null);
	foldersRef.current = props.folders;

	const onTagDrop_: DragEventHandler<HTMLElement> = useCallback(async event => {
		const tagId = event.currentTarget.getAttribute('data-tag-id');
		const dt = event.dataTransfer;
		if (!dt) return;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			event.preventDefault();

			const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));
			for (let i = 0; i < noteIds.length; i++) {
				await Tag.addNote(tagId, noteIds[i]);
			}
		}
	}, []);

	const selectedIndexesRef = useRef(props.selectedIndexes);
	selectedIndexesRef.current = props.selectedIndexes;
	const itemsRef = useRef(props.listItems);
	itemsRef.current = props.listItems;
	const getSelectedIds = useCallback(() => {
		return selectedIndexesRef.current.map(index => {
			const item = itemsRef.current[index];
			if (item.kind === ListItemType.Folder) {
				return item.folder.id;
			} else if (item.kind === ListItemType.Tag) {
				return item.tag.id;
			}
			return null;
		}).filter(id => !!id);
	}, []);

	const onItemClick = useOnItemClick({ dispatch: props.dispatch, selectedIndexesRef, itemsRef });

	const onItemContextMenu: ItemContextMenuListener = useCallback(async event => {
		const itemId = event.currentTarget.getAttribute('data-id');
		if (itemId === Folder.conflictFolderId()) return;

		const itemType = Number(event.currentTarget.getAttribute('data-type'));
		if (!itemId || !itemType) throw new Error('No data on element');

		let itemIds = [itemId];
		const itemIndex = Number(event.currentTarget.getAttribute('data-index'));
		if (selectedIndexesRef.current.includes(itemIndex)) {
			itemIds = getSelectedIds();
		}

		let deleteMessage = '';
		const deleteButtonLabel = _('Remove');

		if (itemType === BaseModel.TYPE_TAG) {
			if (itemIds.length === 1) {
				const tag = await Tag.load(itemId);
				deleteMessage = _('Remove tag "%s" from all notes?', substrWithEllipsis(tag.title, 0, 32));
			} else {
				deleteMessage = _('Remove %d tags from all notes? This cannot be undone.', itemIds.length);
			}
		} else if (itemType === BaseModel.TYPE_SEARCH) {
			deleteMessage = _('Remove this search from the sidebar?');
		}

		const menu = new Menu();

		if (itemId === getTrashFolderId()) {
			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('emptyTrash')),
			);
			menu.popup({ window: bridge().activeWindow() });
			return;
		}

		let item = null;
		if (itemType === BaseModel.TYPE_FOLDER) {
			item = BaseModel.byId(foldersRef.current, itemId);
		}

		const isDeleted = item ? !!item.deleted_time : false;

		if (!isDeleted) {
			const isDecryptedFolder = itemType === BaseModel.TYPE_FOLDER && !item.encryption_applied;
			if (isDecryptedFolder && itemIds.length === 1) {
				menu.append(folderCommandToMenuItem('newFolder', itemId));
			}

			if (itemType === BaseModel.TYPE_FOLDER) {
				menu.append(folderCommandToMenuItem('deleteFolder', itemIds));
			} else {
				menu.append(
					new MenuItem({
						label: deleteButtonLabel,
						click: async () => {
							const ok = bridge().showConfirmMessageBox(deleteMessage, {
								buttons: [deleteButtonLabel, _('Cancel')],
								defaultId: 1,
							});
							if (!ok) return;

							if (itemType === BaseModel.TYPE_TAG) {
								for (const itemId of itemIds) {
									await Tag.untagAll(itemId);
								}
							} else if (itemType === BaseModel.TYPE_SEARCH) {
								props.dispatch({
									type: 'SEARCH_DELETE',
									id: itemId,
								});
							}
						},
					}),
				);
			}

			if (isDecryptedFolder) {
				const whenClause = CommandService.instance().currentWhenClauseContext({ commandFolderIds: itemIds });
				menu.append(new MenuItem({
					...menuUtils.commandToStatefulMenuItem('moveToFolder', itemIds),
					// By default, moveToFolder's enabled condition is based on the selected notes. However, the right-click
					// menu item applies to folders. For now, use a custom condition:
					enabled: !whenClause.foldersIncludeReadOnly,
				}));
			}

			if (isDecryptedFolder && itemIds.length === 1) {
				menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem('openFolderDialog', { folderId: itemId }, { commandFolderId: itemId })));

				menu.append(new MenuItem({ type: 'separator' }));

				const exportMenu = new Menu();
				const ioService = InteropService.instance();
				const ioModules = ioService.modules();
				for (let i = 0; i < ioModules.length; i++) {
					const module = ioModules[i];
					if (module.type !== 'exporter') continue;

					exportMenu.append(
						new MenuItem({
							label: module.fullLabel(),
							click: async () => {
								await InteropServiceHelper.export(props.dispatch, module, { sourceFolderIds: itemIds, plugins: pluginsRef.current });
							},
						}),
					);
				}

				// Only show the share/leave share actions for top-level folders
				const shareFolderItem = folderCommandToMenuItem('showShareFolderDialog', itemId);
				if (shareFolderItem.enabled) menu.append(shareFolderItem);
				const leaveSharedFolderItem = folderCommandToMenuItem('leaveSharedFolder', itemId);
				if (leaveSharedFolderItem.enabled) menu.append(leaveSharedFolderItem);

				menu.append(
					new MenuItem({
						label: _('Export'),
						submenu: exportMenu,
					}),
				);
				if (Setting.value('notes.perFolderSortOrderEnabled')) {
					menu.append(new MenuItem({
						...menuUtils.commandToStatefulMenuItem('togglePerFolderSortOrder', itemId, { commandFolderId: itemId }),
						type: 'checkbox',
						checked: PerFolderSortOrderService.isSet(itemId),
					}));
				}
			}

			if (itemType === BaseModel.TYPE_FOLDER && itemIds.length === 1) {
				menu.append(
					new MenuItem({
						label: _('Copy external link'),
						click: () => {
							clipboard.writeText(getFolderCallbackUrl(itemId));
						},
					}),
				);
			}

			if (itemType === BaseModel.TYPE_TAG && itemIds.length === 1) {
				menu.append(new MenuItem(
					menuUtils.commandToStatefulMenuItem('renameTag', itemId),
				));
				menu.append(
					new MenuItem({
						label: _('Copy external link'),
						click: () => {
							clipboard.writeText(getTagCallbackUrl(itemId));
						},
					}),
				);
			}

			const pluginViews = pluginUtils.viewsByType(pluginsRef.current, 'menuItem');

			for (const view of pluginViews) {
				const location = view.location;

				if (itemType === ModelType.Tag && location === MenuItemLocation.TagContextMenu) {
					menu.append(
						new MenuItem(menuUtils.commandToStatefulMenuItem(view.commandName, itemId)),
					);
				} else if (itemType === ModelType.Folder && location === MenuItemLocation.FolderContextMenu) {
					menu.append(folderCommandToMenuItem(view.commandName, itemId));
				}
			}
		} else {
			if (itemType === BaseModel.TYPE_FOLDER) {
				menu.append(folderCommandToMenuItem('restoreFolder', itemIds));
			}
		}

		menu.popup({ window: bridge().activeWindow() });
	}, [props.dispatch, pluginsRef, getSelectedIds]);



	const onFolderDragStart_: ItemDragListener = useCallback(event => {
		const folderId = event.currentTarget.getAttribute('data-folder-id');
		if (!folderId) return;

		let itemIds = [folderId];
		const itemIndex = Number(event.currentTarget.getAttribute('data-index'));
		if (selectedIndexesRef.current.includes(itemIndex)) {
			itemIds = getSelectedIds();
		}

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-folder-ids', JSON.stringify(itemIds));
	}, [getSelectedIds]);

	const onFolderDragOver_: ItemDragListener = useCallback(event => {
		if (event.dataTransfer.types.indexOf('text/x-jop-note-ids') >= 0) event.preventDefault();
		if (event.dataTransfer.types.indexOf('text/x-jop-folder-ids') >= 0) event.preventDefault();
	}, []);

	const onFolderDrop_: ItemDragListener = useCallback(async event => {
		const folderId = event.currentTarget.getAttribute('data-folder-id');
		const dt = event.dataTransfer;
		if (!dt) return;

		// folderId can be NULL when dropping on the sidebar Notebook header. In that case, it's used
		// to put the dropped folder at the root. But for notes, folderId needs to always be defined
		// since there's no such thing as a root note.

		try {
			if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
				event.preventDefault();
				if (!folderId) return;
				const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));
				await onFolderDrop(noteIds, [], folderId);
			} else if (dt.types.indexOf('text/x-jop-folder-ids') >= 0) {
				event.preventDefault();
				const folderIds = JSON.parse(dt.getData('text/x-jop-folder-ids'));
				await onFolderDrop([], folderIds, folderId);
			}
		} catch (error) {
			logger.error(error);
			await shim.showErrorDialog(error.message);
		}
	}, []);

	const onFolderToggleClick_: ItemClickListener = useCallback(event => {
		const folderId = event.currentTarget.getAttribute('data-folder-id');

		props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folderId,
		});
	}, [props.dispatch]);

	// If at least one of the folder has an icon, then we display icons for all
	// folders (those without one will get the default icon). This is so that
	// visual alignment is correct for all folders, otherwise the folder tree
	// looks messy.
	const showFolderIcons = useMemo(() => {
		return Folder.shouldShowFolderIcons(props.folders);
	}, [props.folders]);

	const itemCount = props.listItems.length;
	return useCallback((item: ListItem, index: number) => {
		const primarySelected = props.selectedIndex === index;
		const selected = primarySelected || props.selectedIndexes.includes(index);
		const selectionState: ItemSelectionState = {
			primarySelected,
			selected,
			multipleItemsSelected: props.selectedIndexes.length > 1,
		};

		const focusInList = document.hasFocus() && props.containerRef.current?.contains(document.activeElement);
		const anchorRef = (focusInList && primarySelected) ? focusListItem : noFocusListItem;

		if (item.kind === ListItemType.Tag) {
			const tag = item.tag;
			return <TagItem
				key={item.key}
				anchorRef={anchorRef}
				selectionState={selectionState}
				onClick={onItemClick}
				onTagDrop={onTagDrop_}
				onContextMenu={onItemContextMenu}
				label={item.label}
				tag={tag}
				itemCount={itemCount}
				index={index}
			/>;
		} else if (item.kind === ListItemType.Folder) {
			const folder = item.folder;
			const isExpanded = props.collapsedFolderIds.indexOf(folder.id) < 0;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let noteCount = (folder as any).note_count;

			// For now hide the count for folders in the trash because it doesn't work and getting it to
			// work would be tricky.
			if (folder.deleted_time || folder.id === getTrashFolderId()) noteCount = 0;

			// Thunderbird count: Subtract children note_count from parent folder if it expanded.
			if (isExpanded) {
				for (let i = 0; i < props.folders.length; i++) {
					if (props.folders[i].parent_id === folder.id) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						noteCount -= (props.folders[i] as any).note_count;
					}
				}
			}
			return <FolderItem
				key={item.key}
				anchorRef={anchorRef}
				selectionState={selectionState}
				folderId={folder.id}
				folderTitle={item.label}
				folderIcon={Folder.unserializeIcon(folder.icon)}
				depth={item.depth}
				isExpanded={isExpanded}
				hasChildren={item.hasChildren}
				noteCount={noteCount}
				onFolderDragStart_={onFolderDragStart_}
				onFolderDragOver_={onFolderDragOver_}
				onFolderDrop_={onFolderDrop_}
				itemContextMenu={onItemContextMenu}
				folderItem_click={onItemClick}
				onFolderToggleClick_={onFolderToggleClick_}
				shareId={folder.share_id}
				parentId={folder.parent_id}
				showFolderIcon={showFolderIcons}
				index={index}
				itemCount={itemCount}
			/>;
		} else if (item.kind === ListItemType.Header) {
			return <HeaderItem
				key={item.id}
				anchorRef={anchorRef}
				item={item}
				selectionState={selectionState}
				onDrop={item.supportsFolderDrop ? onFolderDrop_ : null}
				index={index}
				itemCount={itemCount}
			/>;
		} else if (item.kind === ListItemType.AllNotes) {
			return <AllNotesItem
				key={item.key}
				anchorRef={anchorRef}
				selectionState={selectionState}
				item={item}
				index={index}
				itemCount={itemCount}
			/>;
		} else if (item.kind === ListItemType.Spacer) {
			return (
				<ListItemWrapper
					key={item.key}
					containerRef={anchorRef}
					depth={1}
					selectionState={selectionState}
					itemIndex={index}
					itemCount={itemCount}
					highlightOnHover={false}
					className='sidebar-spacer-item'
				>
					<div aria-label={_('Spacer')}></div>
				</ListItemWrapper>
			);
		} else {
			const exhaustivenessCheck: never = item;
			return exhaustivenessCheck;
		}
	}, [
		onItemClick,
		onFolderDragOver_,
		onFolderDragStart_,
		onFolderDrop_,
		onFolderToggleClick_,
		onItemContextMenu,
		onTagDrop_,
		props.collapsedFolderIds,
		props.folders,
		showFolderIcons,
		props.selectedIndex,
		props.selectedIndexes,
		props.containerRef,
		itemCount,
	]);
};

export default useOnRenderItem;
