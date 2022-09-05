import * as React from 'react';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { StyledRoot, StyledAddButton, StyledShareIcon, StyledHeader, StyledHeaderIcon, StyledAllNotesIcon, StyledHeaderLabel, StyledListItem, StyledListItemAnchor, StyledExpandLink, StyledNoteCount, StyledSyncReportText, StyledSyncReport, StyledSynchronizeButton } from './styles';
import { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import InteropService from '@joplin/lib/services/interop/InteropService';
import Synchronizer from '@joplin/lib/Synchronizer';
import Setting from '@joplin/lib/models/Setting';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import InteropServiceHelper from '../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import { AppState } from '../../app.reducer';
import { ModelType } from '@joplin/lib/BaseModel';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import Logger from '@joplin/lib/Logger';
import { FolderEntity, FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { store } from '@joplin/lib/reducer';
import PerFolderSortOrderService from '../../services/sortOrder/PerFolderSortOrderService';
import { getFolderCallbackUrl, getTagCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import FolderIconBox from '../FolderIconBox';
import { Theme } from '@joplin/lib/themes/type';
import { RuntimeProps } from './commands/focusElementSideBar';
const { connect } = require('react-redux');
const shared = require('@joplin/lib/components/shared/side-menu-shared.js');
const { themeStyle } = require('@joplin/lib/theme');
const bridge = require('@electron/remote').require('./bridge').default;
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const { substrWithEllipsis } = require('@joplin/lib/string-utils');
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');
const { clipboard } = require('electron');

const logger = Logger.create('Sidebar');

interface Props {
	themeId: number;
	dispatch: Function;
	folders: any[];
	collapsedFolderIds: string[];
	notesParentType: string;
	selectedFolderId: string;
	selectedTagId: string;
	selectedSmartFilterId: string;
	decryptionWorker: any;
	resourceFetcher: any;
	syncReport: any;
	tags: any[];
	syncStarted: boolean;
	plugins: PluginStates;
	folderHeaderIsExpanded: boolean;
	tagHeaderIsExpanded: boolean;
}

const commands = [
	require('./commands/focusElementSideBar'),
];

function ExpandIcon(props: any) {
	const theme = themeStyle(props.themeId);
	const style: any = { width: 16, maxWidth: 16, opacity: 0.5, fontSize: Math.round(theme.toolbarIconSize * 0.8), display: 'flex', justifyContent: 'center' };
	if (!props.isVisible) style.visibility = 'hidden';
	return <i className={props.isExpanded ? 'fas fa-caret-down' : 'fas fa-caret-right'} style={style}></i>;
}

function ExpandLink(props: any) {
	return props.hasChildren ? (
		<StyledExpandLink href="#" data-folder-id={props.folderId} onClick={props.onClick}>
			<ExpandIcon themeId={props.themeId} isVisible={true} isExpanded={props.isExpanded}/>
		</StyledExpandLink>
	) : (
		<StyledExpandLink><ExpandIcon themeId={props.themeId} isVisible={false} isExpanded={false}/></StyledExpandLink>
	);
}

const renderFolderIcon = (folderIcon: FolderIcon) => {
	if (!folderIcon) {
		const defaultFolderIcon: FolderIcon = {
			dataUrl: '',
			emoji: '',
			name: 'far fa-folder',
			type: FolderIconType.FontAwesome,
		};
		return <div style={{ marginRight: 5, display: 'flex' }}><FolderIconBox opacity={0.7} folderIcon={defaultFolderIcon}/></div>;
	}

	return <div style={{ marginRight: 5, display: 'flex' }}><FolderIconBox folderIcon={folderIcon}/></div>;
};

function FolderItem(props: any) {
	const { hasChildren, showFolderIcon, isExpanded, parentId, depth, selected, folderId, folderTitle, folderIcon, anchorRef, noteCount, onFolderDragStart_, onFolderDragOver_, onFolderDrop_, itemContextMenu, folderItem_click, onFolderToggleClick_, shareId } = props;

	const noteCountComp = noteCount ? <StyledNoteCount className="note-count-label">{noteCount}</StyledNoteCount> : null;

	const shareIcon = shareId && !parentId ? <StyledShareIcon className="fas fa-share-alt"></StyledShareIcon> : null;

	return (
		<StyledListItem depth={depth} selected={selected} className={`list-item-container list-item-depth-${depth} ${selected ? 'selected' : ''}`} onDragStart={onFolderDragStart_} onDragOver={onFolderDragOver_} onDrop={onFolderDrop_} draggable={true} data-folder-id={folderId}>
			<ExpandLink themeId={props.themeId} hasChildren={hasChildren} folderId={folderId} onClick={onFolderToggleClick_} isExpanded={isExpanded}/>
			<StyledListItemAnchor
				ref={anchorRef}
				className="list-item"
				isConflictFolder={folderId === Folder.conflictFolderId()}
				href="#"
				selected={selected}
				shareId={shareId}
				data-id={folderId}
				data-type={BaseModel.TYPE_FOLDER}
				onContextMenu={itemContextMenu}
				data-folder-id={folderId}
				onClick={() => {
					folderItem_click(folderId);
				}}
				onDoubleClick={onFolderToggleClick_}
			>
				{showFolderIcon ? renderFolderIcon(folderIcon) : null}<span className="title" style={{ lineHeight: 0 }}>{folderTitle}</span>
				{shareIcon} {noteCountComp}
			</StyledListItemAnchor>
		</StyledListItem>
	);
}

const menuUtils = new MenuUtils(CommandService.instance());

const SidebarComponent = (props: Props) => {

	const folderItemsOrder_ = useRef<any[]>();
	folderItemsOrder_.current = [];
	const tagItemsOrder_ = useRef<any[]>();
	tagItemsOrder_.current = [];

	const rootRef = useRef(null);
	const anchorItemRefs = useRef<Record<string, any>>(null);
	anchorItemRefs.current = {};

	// This whole component is a bit of a mess and rather than passing
	// a plugins prop around, not knowing how it's going to affect
	// re-rendering, we just keep a ref to it. Currently that's enough
	// as plugins are only accessed from context menus. However if want
	// to do more complex things with plugins in the sidebar, it will
	// probably have to be refactored using React Hooks first.
	const pluginsRef = useRef<PluginStates>(null);
	pluginsRef.current = props.plugins;

	// If at least one of the folder has an icon, then we display icons for all
	// folders (those without one will get the default icon). This is so that
	// visual alignment is correct for all folders, otherwise the folder tree
	// looks messy.
	const showFolderIcons = useMemo(() => {
		return !!props.folders.find((f: FolderEntity) => !!f.icon);
	}, [props.folders]);

	const getSelectedItem = useCallback(() => {
		if (props.notesParentType === 'Folder' && props.selectedFolderId) {
			return { type: 'folder', id: props.selectedFolderId };
		} else if (props.notesParentType === 'Tag' && props.selectedTagId) {
			return { type: 'tag', id: props.selectedTagId };
		}

		return null;
	}, [props.notesParentType, props.selectedFolderId, props.selectedTagId]);

	const getFirstAnchorItemRef = useCallback((type: string) => {
		const refs = anchorItemRefs.current[type];
		if (!refs) return null;

		const p = type === 'folder' ? props.folders : props.tags;
		const item = p && p.length ? p[0] : null;
		if (!item) return null;

		return refs[item.id];
	}, [anchorItemRefs, props.folders, props.tags]);

	useEffect(() => {
		const runtimeProps: RuntimeProps = {
			getSelectedItem,
			anchorItemRefs,
			getFirstAnchorItemRef,
		};

		CommandService.instance().componentRegisterCommands(runtimeProps, commands);

		return () => {
			CommandService.instance().componentUnregisterCommands(commands);
		};
	}, [
		getSelectedItem,
		anchorItemRefs,
		getFirstAnchorItemRef,
	]);

	const onFolderDragStart_ = useCallback((event: any) => {
		const folderId = event.currentTarget.getAttribute('data-folder-id');
		if (!folderId) return;

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-folder-ids', JSON.stringify([folderId]));
	}, []);

	const onFolderDragOver_ = useCallback((event: any) => {
		if (event.dataTransfer.types.indexOf('text/x-jop-note-ids') >= 0) event.preventDefault();
		if (event.dataTransfer.types.indexOf('text/x-jop-folder-ids') >= 0) event.preventDefault();
	}, []);

	const onFolderDrop_ = useCallback(async (event: any) => {
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
				for (let i = 0; i < noteIds.length; i++) {
					await Note.moveToFolder(noteIds[i], folderId);
				}
			} else if (dt.types.indexOf('text/x-jop-folder-ids') >= 0) {
				event.preventDefault();

				const folderIds = JSON.parse(dt.getData('text/x-jop-folder-ids'));
				for (let i = 0; i < folderIds.length; i++) {
					await Folder.moveToFolder(folderIds[i], folderId);
				}
			}
		} catch (error) {
			logger.error(error);
			alert(error.message);
		}
	}, []);

	const onTagDrop_ = useCallback(async (event: any) => {
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

	const onFolderToggleClick_ = useCallback((event: any) => {
		const folderId = event.currentTarget.getAttribute('data-folder-id');

		props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folderId,
		});
	}, [props.dispatch]);

	const header_contextMenu = useCallback(async () => {
		const menu = new Menu();

		menu.append(
			new MenuItem(menuUtils.commandToStatefulMenuItem('newFolder'))
		);

		menu.popup(bridge().window());
	}, []);

	const itemContextMenu = useCallback(async (event: any) => {
		const itemId = event.currentTarget.getAttribute('data-id');
		if (itemId === Folder.conflictFolderId()) return;

		const itemType = Number(event.currentTarget.getAttribute('data-type'));
		if (!itemId || !itemType) throw new Error('No data on element');

		const state: AppState = store().getState();

		let deleteMessage = '';
		let deleteButtonLabel = _('Remove');
		if (itemType === BaseModel.TYPE_FOLDER) {
			const folder = await Folder.load(itemId);
			deleteMessage = _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', substrWithEllipsis(folder.title, 0, 32));
			deleteButtonLabel = _('Delete');
		} else if (itemType === BaseModel.TYPE_TAG) {
			const tag = await Tag.load(itemId);
			deleteMessage = _('Remove tag "%s" from all notes?', substrWithEllipsis(tag.title, 0, 32));
		} else if (itemType === BaseModel.TYPE_SEARCH) {
			deleteMessage = _('Remove this search from the sidebar?');
		}

		const menu = new Menu();

		let item = null;
		if (itemType === BaseModel.TYPE_FOLDER) {
			item = BaseModel.byId(props.folders, itemId);
		}

		if (itemType === BaseModel.TYPE_FOLDER && !item.encryption_applied) {
			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('newFolder', itemId))
			);
		}

		menu.append(
			new MenuItem({
				label: deleteButtonLabel,
				click: async () => {
					const ok = bridge().showConfirmMessageBox(deleteMessage, {
						buttons: [deleteButtonLabel, _('Cancel')],
						defaultId: 1,
					});
					if (!ok) return;

					if (itemType === BaseModel.TYPE_FOLDER) {
						await Folder.delete(itemId);
					} else if (itemType === BaseModel.TYPE_TAG) {
						await Tag.untagAll(itemId);
					} else if (itemType === BaseModel.TYPE_SEARCH) {
						props.dispatch({
							type: 'SEARCH_DELETE',
							id: itemId,
						});
					}
				},
			})
		);

		if (itemType === BaseModel.TYPE_FOLDER && !item.encryption_applied) {
			menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem('openFolderDialog', { folderId: itemId })));

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
							await InteropServiceHelper.export(props.dispatch, module, { sourceFolderIds: [itemId], plugins: pluginsRef.current });
						},
					})
				);
			}

			// We don't display the "Share notebook" menu item for sub-notebooks
			// that are within a shared notebook. If user wants to do this,
			// they'd have to move the notebook out of the shared notebook
			// first.
			const whenClause = stateToWhenClauseContext(state, { commandFolderId: itemId });

			if (CommandService.instance().isEnabled('showShareFolderDialog', whenClause)) {
				menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem('showShareFolderDialog', itemId)));
			}

			if (CommandService.instance().isEnabled('leaveSharedFolder', whenClause)) {
				menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem('leaveSharedFolder', itemId)));
			}

			menu.append(
				new MenuItem({
					label: _('Export'),
					submenu: exportMenu,
				})
			);
			if (Setting.value('notes.perFolderSortOrderEnabled')) {
				menu.append(new MenuItem({
					...menuUtils.commandToStatefulMenuItem('togglePerFolderSortOrder', itemId),
					type: 'checkbox',
					checked: PerFolderSortOrderService.isSet(itemId),
				}));
			}
		}

		if (itemType === BaseModel.TYPE_FOLDER) {
			menu.append(
				new MenuItem({
					label: _('Copy external link'),
					click: () => {
						clipboard.writeText(getFolderCallbackUrl(itemId));
					},
				})
			);
		}

		if (itemType === BaseModel.TYPE_TAG) {
			menu.append(new MenuItem(
				menuUtils.commandToStatefulMenuItem('renameTag', itemId)
			));
			menu.append(
				new MenuItem({
					label: _('Copy external link'),
					click: () => {
						clipboard.writeText(getTagCallbackUrl(itemId));
					},
				})
			);
		}

		const pluginViews = pluginUtils.viewsByType(pluginsRef.current, 'menuItem');

		for (const view of pluginViews) {
			const location = view.location;

			if (itemType === ModelType.Tag && location === MenuItemLocation.TagContextMenu ||
				itemType === ModelType.Folder && location === MenuItemLocation.FolderContextMenu
			) {
				menu.append(
					new MenuItem(menuUtils.commandToStatefulMenuItem(view.commandName, itemId))
				);
			}
		}

		menu.popup(bridge().window());
	}, [props.folders, props.dispatch, pluginsRef]);

	const folderItem_click = useCallback((folderId: string) => {
		props.dispatch({
			type: 'FOLDER_SELECT',
			id: folderId ? folderId : null,
		});
	}, [props.dispatch]);

	const tagItem_click = useCallback((tag: any) => {
		props.dispatch({
			type: 'TAG_SELECT',
			id: tag ? tag.id : null,
		});
	}, [props.dispatch]);

	const onHeaderClick_ = useCallback((key: string) => {
		const isExpanded = key === 'tag' ? props.tagHeaderIsExpanded : props.folderHeaderIsExpanded;
		Setting.setValue(key === 'tag' ? 'tagHeaderIsExpanded' : 'folderHeaderIsExpanded', !isExpanded);
	}, [props.folderHeaderIsExpanded, props.tagHeaderIsExpanded]);

	const onAllNotesClick_ = () => {
		props.dispatch({
			type: 'SMART_FILTER_SELECT',
			id: ALL_NOTES_FILTER_ID,
		});
	};

	const anchorItemRef = (type: string, id: string) => {
		if (!anchorItemRefs.current[type]) anchorItemRefs.current[type] = {};
		if (anchorItemRefs.current[type][id]) return anchorItemRefs.current[type][id];
		anchorItemRefs.current[type][id] = React.createRef();
		return anchorItemRefs.current[type][id];
	};

	const renderNoteCount = (count: number) => {
		return count ? <StyledNoteCount className="note-count-label">{count}</StyledNoteCount> : null;
	};

	const renderExpandIcon = (theme: any, isExpanded: boolean, isVisible: boolean) => {
		const style: any = { width: 16, maxWidth: 16, opacity: 0.5, fontSize: Math.round(theme.toolbarIconSize * 0.8), display: 'flex', justifyContent: 'center' };
		if (!isVisible) style.visibility = 'hidden';
		return <i className={isExpanded ? 'fas fa-caret-down' : 'fas fa-caret-right'} style={style}></i>;
	};

	const renderAllNotesItem = (theme: Theme, selected: boolean) => {
		return (
			<StyledListItem key="allNotesHeader" selected={selected} className={'list-item-container list-item-depth-0 all-notes'} isSpecialItem={true}>
				<StyledExpandLink>{renderExpandIcon(theme, false, false)}</StyledExpandLink>
				<StyledAllNotesIcon className="icon-notes"/>
				<StyledListItemAnchor
					className="list-item"
					isSpecialItem={true}
					href="#"
					selected={selected}
					onClick={onAllNotesClick_}
				>
					{_('All notes')}
				</StyledListItemAnchor>
			</StyledListItem>
		);
	};

	const renderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number) =>{
		const anchorRef = anchorItemRef('folder', folder.id);
		const isExpanded = props.collapsedFolderIds.indexOf(folder.id) < 0;
		let noteCount = (folder as any).note_count;

		// Thunderbird count: Subtract children note_count from parent folder if it expanded.
		if (isExpanded) {
			for (let i = 0; i < props.folders.length; i++) {
				if (props.folders[i].parent_id === folder.id) {
					noteCount -= props.folders[i].note_count;
				}
			}
		}

		return <FolderItem
			key={folder.id}
			folderId={folder.id}
			folderTitle={Folder.displayTitle(folder)}
			folderIcon={Folder.unserializeIcon(folder.icon)}
			themeId={props.themeId}
			depth={depth}
			selected={selected}
			isExpanded={isExpanded}
			hasChildren={hasChildren}
			anchorRef={anchorRef}
			noteCount={noteCount}
			onFolderDragStart_={onFolderDragStart_}
			onFolderDragOver_={onFolderDragOver_}
			onFolderDrop_={onFolderDrop_}
			itemContextMenu={itemContextMenu}
			folderItem_click={folderItem_click}
			onFolderToggleClick_={onFolderToggleClick_}
			shareId={folder.share_id}
			parentId={folder.parent_id}
			showFolderIcon={showFolderIcons}
		/>;
	};

	const renderTag = (tag: any, selected: boolean) => {
		const anchorRef = anchorItemRef('tag', tag.id);
		let noteCount = null;
		if (Setting.value('showNoteCounts')) {
			if (Setting.value('showCompletedTodos')) noteCount = renderNoteCount(tag.note_count);
			else noteCount = renderNoteCount(tag.note_count - tag.todo_completed_count);
		}

		return (
			<StyledListItem selected={selected}
				className={`list-item-container ${selected ? 'selected' : ''}`}
				key={tag.id}
				onDrop={onTagDrop_}
				data-tag-id={tag.id}
			>
				<StyledExpandLink>{renderExpandIcon(theme, false, false)}</StyledExpandLink>
				<StyledListItemAnchor
					ref={anchorRef}
					className="list-item"
					href="#"
					selected={selected}
					data-id={tag.id}
					data-type={BaseModel.TYPE_TAG}
					onContextMenu={itemContextMenu}
					onClick={() => {
						tagItem_click(tag);
					}}
				>
					<span className="tag-label">{Tag.displayTitle(tag)}</span>
					{noteCount}
				</StyledListItemAnchor>
			</StyledListItem>
		);
	};

	const renderHeader = (key: string, label: string, iconName: string, contextMenuHandler: Function = null, onPlusButtonClick: Function = null, extraProps: any = {}) => {
		const headerClick = extraProps.onClick || null;
		delete extraProps.onClick;
		const ref = anchorItemRef('headers', key);

		return (
			<div key={key} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
				<StyledHeader
					ref={ref}
					{...extraProps}
					onContextMenu={contextMenuHandler}
					onClick={(event: any) => {
						// if a custom click event is attached, trigger that.
						if (headerClick) {
							headerClick(key, event);
						}
						onHeaderClick_(key);
					}}
				>
					<StyledHeaderIcon className={iconName}/>
					<StyledHeaderLabel>{label}</StyledHeaderLabel>
				</StyledHeader>
				{ onPlusButtonClick && <StyledAddButton onClick={onPlusButtonClick} iconName="fas fa-plus" level={ButtonLevel.SidebarSecondary}/> }
			</div>
		);
	};

	const onKeyDown = useCallback((event: any) => {
		const keyCode = event.keyCode;
		const selectedItem = getSelectedItem();

		if (keyCode === 40 || keyCode === 38) {
			// DOWN / UP
			event.preventDefault();

			const focusItems = [];

			for (let i = 0; i < folderItemsOrder_.current.length; i++) {
				const id = folderItemsOrder_.current[i];
				focusItems.push({ id: id, ref: anchorItemRefs.current['folder'][id], type: 'folder' });
			}

			for (let i = 0; i < tagItemsOrder_.current.length; i++) {
				const id = tagItemsOrder_.current[i];
				focusItems.push({ id: id, ref: anchorItemRefs.current['tag'][id], type: 'tag' });
			}

			let currentIndex = 0;
			for (let i = 0; i < focusItems.length; i++) {
				if (!selectedItem || focusItems[i].id === selectedItem.id) {
					currentIndex = i;
					break;
				}
			}

			const inc = keyCode === 38 ? -1 : +1;
			let newIndex = currentIndex + inc;

			if (newIndex < 0) newIndex = 0;
			if (newIndex > focusItems.length - 1) newIndex = focusItems.length - 1;

			const focusItem = focusItems[newIndex];

			const actionName = `${focusItem.type.toUpperCase()}_SELECT`;

			props.dispatch({
				type: actionName,
				id: focusItem.id,
			});

			focusItem.ref.current.focus();
		}

		if (keyCode === 9) {
			// TAB
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'noteBody');
			} else {
				void CommandService.instance().execute('focusElement', 'noteList');
			}
		}

		if (selectedItem && selectedItem.type === 'folder' && keyCode === 32) {
			// SPACE
			event.preventDefault();

			props.dispatch({
				type: 'FOLDER_TOGGLE',
				id: selectedItem.id,
			});
		}

		if (keyCode === 65 && (event.ctrlKey || event.metaKey)) {
			// Ctrl+A key
			event.preventDefault();
		}
	}, [getSelectedItem, props.dispatch]);

	const renderSynchronizeButton = (type: string) => {
		const label = type === 'sync' ? _('Synchronise') : _('Cancel');
		const iconAnimation = type !== 'sync' ? 'icon-infinite-rotation 1s linear infinite' : '';

		return (
			<StyledSynchronizeButton
				level={ButtonLevel.SidebarSecondary}
				iconName="icon-sync"
				key="sync_button"
				iconAnimation={iconAnimation}
				title={label}
				onClick={() => {
					void CommandService.instance().execute('synchronize', type !== 'sync');
				}}
			/>
		);
	};

	const onAddFolderButtonClick = useCallback(() => {
		void CommandService.instance().execute('newFolder');
	}, []);

	const theme = themeStyle(props.themeId);

	const items = [];

	items.push(
		renderHeader('folderHeader', _('Notebooks'), 'icon-notebooks', header_contextMenu, onAddFolderButtonClick, {
			onDrop: onFolderDrop_,
			['data-folder-id']: '',
			toggleblock: 1,
		})
	);

	if (props.folders.length) {
		const allNotesSelected = props.notesParentType === 'SmartFilter' && props.selectedSmartFilterId === ALL_NOTES_FILTER_ID;
		const result = shared.renderFolders(props, renderFolderItem);
		const folderItems = [renderAllNotesItem(theme, allNotesSelected)].concat(result.items);
		folderItemsOrder_.current = result.order;
		items.push(
			<div
				className={`folders ${props.folderHeaderIsExpanded ? 'expanded' : ''}`}
				key="folder_items"
				style={{ display: props.folderHeaderIsExpanded ? 'block' : 'none', paddingBottom: 10 }}
			>
				{folderItems}
			</div>
		);
	}

	items.push(
		renderHeader('tagHeader', _('Tags'), 'icon-tags', null, null, {
			toggleblock: 1,
		})
	);

	if (props.tags.length) {
		const result = shared.renderTags(props, renderTag);
		const tagItems = result.items;
		tagItemsOrder_.current = result.order;

		items.push(
			<div className="tags" key="tag_items" style={{ display: props.tagHeaderIsExpanded ? 'block' : 'none' }}>
				{tagItems}
			</div>
		);
	}

	let decryptionReportText = '';
	if (props.decryptionWorker && props.decryptionWorker.state !== 'idle' && props.decryptionWorker.itemCount) {
		decryptionReportText = _('Decrypting items: %d/%d', props.decryptionWorker.itemIndex + 1, props.decryptionWorker.itemCount);
	}

	let resourceFetcherText = '';
	if (props.resourceFetcher && props.resourceFetcher.toFetchCount) {
		resourceFetcherText = _('Fetching resources: %d/%d', props.resourceFetcher.fetchingCount, props.resourceFetcher.toFetchCount);
	}

	const lines = Synchronizer.reportToLines(props.syncReport);
	if (resourceFetcherText) lines.push(resourceFetcherText);
	if (decryptionReportText) lines.push(decryptionReportText);
	const syncReportText = [];
	for (let i = 0; i < lines.length; i++) {
		syncReportText.push(
			<StyledSyncReportText key={i}>
				{lines[i]}
			</StyledSyncReportText>
		);
	}

	const syncButton = renderSynchronizeButton(props.syncStarted ? 'cancel' : 'sync');

	const syncReportComp = !syncReportText.length ? null : (
		<StyledSyncReport key="sync_report">
			{syncReportText}
		</StyledSyncReport>
	);

	return (
		<StyledRoot ref={rootRef} onKeyDown={onKeyDown} className="sidebar">
			<div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{items}</div>
			<div style={{ flex: 0, padding: theme.mainPadding }}>
				{syncReportComp}
				{syncButton}
			</div>
		</StyledRoot>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		folders: state.folders,
		tags: state.tags,
		searches: state.searches,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		selectedSearchId: state.selectedSearchId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		plugins: state.pluginService.plugins,
		tagHeaderIsExpanded: state.settings.tagHeaderIsExpanded,
		folderHeaderIsExpanded: state.settings.folderHeaderIsExpanded,
	};
};

export default connect(mapStateToProps)(SidebarComponent);
