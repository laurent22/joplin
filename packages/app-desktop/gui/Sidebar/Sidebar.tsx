import * as React from 'react';
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
import { FolderEntity } from '@joplin/lib/services/database/types';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { store } from '@joplin/lib/reducer';
import PerFolderSortOrderService from '../../services/sortOrder/PerFolderSortOrderService';
import { getFolderCallbackUrl, getTagCallbackUrl } from '@joplin/lib/callbackUrlUtils';
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
}

interface State {
	tagHeaderIsExpanded: boolean;
	folderHeaderIsExpanded: boolean;
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

function FolderItem(props: any) {
	const { hasChildren, isExpanded, parentId, depth, selected, folderId, folderTitle, anchorRef, noteCount, onFolderDragStart_, onFolderDragOver_, onFolderDrop_, itemContextMenu, folderItem_click, onFolderToggleClick_, shareId } = props;

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
				<span className="title">{folderTitle}</span>
				{shareIcon} {noteCountComp}
			</StyledListItemAnchor>
		</StyledListItem>
	);
}

const menuUtils = new MenuUtils(CommandService.instance());

class SidebarComponent extends React.Component<Props, State> {

	private folderItemsOrder_: any[] = [];
	private tagItemsOrder_: any[] = [];
	private rootRef: any = null;
	private anchorItemRefs: any = {};
	private pluginsRef: any;

	constructor(props: any) {
		super(props);

		CommandService.instance().componentRegisterCommands(this, commands);

		this.state = {
			tagHeaderIsExpanded: Setting.value('tagHeaderIsExpanded'),
			folderHeaderIsExpanded: Setting.value('folderHeaderIsExpanded'),
		};

		// This whole component is a bit of a mess and rather than passing
		// a plugins prop around, not knowing how it's going to affect
		// re-rendering, we just keep a ref to it. Currently that's enough
		// as plugins are only accessed from context menus. However if want
		// to do more complex things with plugins in the sidebar, it will
		// probably have to be refactored using React Hooks first.
		this.pluginsRef = React.createRef();

		this.onFolderToggleClick_ = this.onFolderToggleClick_.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onAllNotesClick_ = this.onAllNotesClick_.bind(this);
		this.header_contextMenu = this.header_contextMenu.bind(this);
		this.onAddFolderButtonClick = this.onAddFolderButtonClick.bind(this);
		this.folderItem_click = this.folderItem_click.bind(this);
		this.itemContextMenu = this.itemContextMenu.bind(this);
	}

	onFolderDragStart_(event: any) {
		const folderId = event.currentTarget.getAttribute('data-folder-id');
		if (!folderId) return;

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-folder-ids', JSON.stringify([folderId]));
	}

	onFolderDragOver_(event: any) {
		if (event.dataTransfer.types.indexOf('text/x-jop-note-ids') >= 0) event.preventDefault();
		if (event.dataTransfer.types.indexOf('text/x-jop-folder-ids') >= 0) event.preventDefault();
	}

	async onFolderDrop_(event: any) {
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
	}

	async onTagDrop_(event: any) {
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
	}

	async onFolderToggleClick_(event: any) {
		const folderId = event.currentTarget.getAttribute('data-folder-id');

		this.props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folderId,
		});
	}

	componentWillUnmount() {
		CommandService.instance().componentUnregisterCommands(commands);
	}

	async header_contextMenu() {
		const menu = new Menu();

		menu.append(
			new MenuItem(menuUtils.commandToStatefulMenuItem('newFolder'))
		);

		menu.popup(bridge().window());
	}

	async itemContextMenu(event: any) {
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
			item = BaseModel.byId(this.props.folders, itemId);
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
						this.props.dispatch({
							type: 'SEARCH_DELETE',
							id: itemId,
						});
					}
				},
			})
		);

		if (itemType === BaseModel.TYPE_FOLDER && !item.encryption_applied) {
			menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem('renameFolder', itemId)));

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
							await InteropServiceHelper.export(this.props.dispatch.bind(this), module, { sourceFolderIds: [itemId], plugins: this.pluginsRef.current });
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

		const pluginViews = pluginUtils.viewsByType(this.pluginsRef.current, 'menuItem');

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
	}

	folderItem_click(folderId: string) {
		this.props.dispatch({
			type: 'FOLDER_SELECT',
			id: folderId ? folderId : null,
		});
	}

	tagItem_click(tag: any) {
		this.props.dispatch({
			type: 'TAG_SELECT',
			id: tag ? tag.id : null,
		});
	}

	anchorItemRef(type: string, id: string) {
		if (!this.anchorItemRefs[type]) this.anchorItemRefs[type] = {};
		if (this.anchorItemRefs[type][id]) return this.anchorItemRefs[type][id];
		this.anchorItemRefs[type][id] = React.createRef();
		return this.anchorItemRefs[type][id];
	}

	firstAnchorItemRef(type: string) {
		const refs = this.anchorItemRefs[type];
		if (!refs) return null;

		const n = `${type}s`;
		const p = this.props as any;
		const item = p[n] && p[n].length ? p[n][0] : null;
		if (!item) return null;

		return refs[item.id];
	}

	renderNoteCount(count: number) {
		return count ? <StyledNoteCount className="note-count-label">{count}</StyledNoteCount> : null;
	}

	renderExpandIcon(isExpanded: boolean, isVisible: boolean = true) {
		const theme = themeStyle(this.props.themeId);
		const style: any = { width: 16, maxWidth: 16, opacity: 0.5, fontSize: Math.round(theme.toolbarIconSize * 0.8), display: 'flex', justifyContent: 'center' };
		if (!isVisible) style.visibility = 'hidden';
		return <i className={isExpanded ? 'fas fa-caret-down' : 'fas fa-caret-right'} style={style}></i>;
	}

	renderAllNotesItem(selected: boolean) {
		return (
			<StyledListItem key="allNotesHeader" selected={selected} className={'list-item-container list-item-depth-0 all-notes'} isSpecialItem={true}>
				<StyledExpandLink>{this.renderExpandIcon(false, false)}</StyledExpandLink>
				<StyledAllNotesIcon className="icon-notes"/>
				<StyledListItemAnchor
					className="list-item"
					isSpecialItem={true}
					href="#"
					selected={selected}
					onClick={this.onAllNotesClick_}
				>
					{_('All notes')}
				</StyledListItemAnchor>
			</StyledListItem>
		);
	}

	renderFolderItem(folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number) {
		const anchorRef = this.anchorItemRef('folder', folder.id);
		const isExpanded = this.props.collapsedFolderIds.indexOf(folder.id) < 0;
		let noteCount = (folder as any).note_count;

		// Thunderbird count: Subtract children note_count from parent folder if it expanded.
		if (isExpanded) {
			for (let i = 0; i < this.props.folders.length; i++) {
				if (this.props.folders[i].parent_id === folder.id) {
					noteCount -= this.props.folders[i].note_count;
				}
			}
		}

		return <FolderItem
			key={folder.id}
			folderId={folder.id}
			folderTitle={Folder.displayTitle(folder)}
			themeId={this.props.themeId}
			depth={depth}
			selected={selected}
			isExpanded={isExpanded}
			hasChildren={hasChildren}
			anchorRef={anchorRef}
			noteCount={noteCount}
			onFolderDragStart_={this.onFolderDragStart_}
			onFolderDragOver_={this.onFolderDragOver_}
			onFolderDrop_={this.onFolderDrop_}
			itemContextMenu={this.itemContextMenu}
			folderItem_click={this.folderItem_click}
			onFolderToggleClick_={this.onFolderToggleClick_}
			shareId={folder.share_id}
			parentId={folder.parent_id}
		/>;
	}

	renderTag(tag: any, selected: boolean) {
		const anchorRef = this.anchorItemRef('tag', tag.id);
		let noteCount = null;
		if (Setting.value('showNoteCounts')) {
			if (Setting.value('showCompletedTodos')) noteCount = this.renderNoteCount(tag.note_count);
			else noteCount = this.renderNoteCount(tag.note_count - tag.todo_completed_count);
		}

		return (
			<StyledListItem selected={selected}
				className={`list-item-container ${selected ? 'selected' : ''}`}
				key={tag.id}
				onDrop={this.onTagDrop_}
				data-tag-id={tag.id}
			>
				<StyledExpandLink>{this.renderExpandIcon(false, false)}</StyledExpandLink>
				<StyledListItemAnchor
					ref={anchorRef}
					className="list-item"
					href="#"
					selected={selected}
					data-id={tag.id}
					data-type={BaseModel.TYPE_TAG}
					onContextMenu={this.itemContextMenu}
					onClick={() => {
						this.tagItem_click(tag);
					}}
				>
					<span className="tag-label">{Tag.displayTitle(tag)}</span>
					{noteCount}
				</StyledListItemAnchor>
			</StyledListItem>
		);
	}

	makeDivider(key: string) {
		return <div style={{ height: 2, backgroundColor: 'blue' }} key={key} />;
	}

	renderHeader(key: string, label: string, iconName: string, contextMenuHandler: Function = null, onPlusButtonClick: Function = null, extraProps: any = {}) {
		const headerClick = extraProps.onClick || null;
		delete extraProps.onClick;
		const ref = this.anchorItemRef('headers', key);

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
						this.onHeaderClick_(key);
					}}
				>
					<StyledHeaderIcon className={iconName}/>
					<StyledHeaderLabel>{label}</StyledHeaderLabel>
				</StyledHeader>
				{ onPlusButtonClick && <StyledAddButton onClick={onPlusButtonClick} iconName="fas fa-plus" level={ButtonLevel.SidebarSecondary}/> }
			</div>
		);
	}

	selectedItem() {
		if (this.props.notesParentType === 'Folder' && this.props.selectedFolderId) {
			return { type: 'folder', id: this.props.selectedFolderId };
		} else if (this.props.notesParentType === 'Tag' && this.props.selectedTagId) {
			return { type: 'tag', id: this.props.selectedTagId };
		}

		return null;
	}

	onKeyDown(event: any) {
		const keyCode = event.keyCode;
		const selectedItem = this.selectedItem();

		if (keyCode === 40 || keyCode === 38) {
			// DOWN / UP
			event.preventDefault();

			const focusItems = [];

			for (let i = 0; i < this.folderItemsOrder_.length; i++) {
				const id = this.folderItemsOrder_[i];
				focusItems.push({ id: id, ref: this.anchorItemRefs['folder'][id], type: 'folder' });
			}

			for (let i = 0; i < this.tagItemsOrder_.length; i++) {
				const id = this.tagItemsOrder_[i];
				focusItems.push({ id: id, ref: this.anchorItemRefs['tag'][id], type: 'tag' });
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

			this.props.dispatch({
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

			this.props.dispatch({
				type: 'FOLDER_TOGGLE',
				id: selectedItem.id,
			});
		}

		if (keyCode === 65 && (event.ctrlKey || event.metaKey)) {
			// Ctrl+A key
			event.preventDefault();
		}
	}

	onHeaderClick_(key: string) {
		const toggleKey = `${key}IsExpanded`;
		const isExpanded = (this.state as any)[toggleKey];
		const newState: any = { [toggleKey]: !isExpanded };
		this.setState(newState);
		Setting.setValue(toggleKey, !isExpanded);
	}

	onAllNotesClick_() {
		this.props.dispatch({
			type: 'SMART_FILTER_SELECT',
			id: ALL_NOTES_FILTER_ID,
		});
	}

	renderSynchronizeButton(type: string) {
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
	}

	onAddFolderButtonClick() {
		void CommandService.instance().execute('newFolder');
	}

	// componentDidUpdate(prevProps:any, prevState:any) {
	// 	for (const n in prevProps) {
	// 		if (prevProps[n] !== (this.props as any)[n]) {
	// 			console.info('CHANGED PROPS', n);
	// 		}
	// 	}

	// 	for (const n in prevState) {
	// 		if (prevState[n] !== (this.state as any)[n]) {
	// 			console.info('CHANGED STATE', n);
	// 		}
	// 	}
	// }

	render() {
		this.pluginsRef.current = this.props.plugins;

		const theme = themeStyle(this.props.themeId);

		const items = [];

		items.push(
			this.renderHeader('folderHeader', _('Notebooks'), 'icon-notebooks', this.header_contextMenu, this.onAddFolderButtonClick, {
				onDrop: this.onFolderDrop_,
				['data-folder-id']: '',
				toggleblock: 1,
			})
		);

		if (this.props.folders.length) {
			const allNotesSelected = this.props.notesParentType === 'SmartFilter' && this.props.selectedSmartFilterId === ALL_NOTES_FILTER_ID;
			const result = shared.renderFolders(this.props, this.renderFolderItem.bind(this));
			const folderItems = [this.renderAllNotesItem(allNotesSelected)].concat(result.items);
			this.folderItemsOrder_ = result.order;
			items.push(
				<div
					className={`folders ${this.state.folderHeaderIsExpanded ? 'expanded' : ''}`}
					key="folder_items"
					style={{ display: this.state.folderHeaderIsExpanded ? 'block' : 'none', paddingBottom: 10 }}
				>
					{folderItems}
				</div>
			);
		}

		items.push(
			this.renderHeader('tagHeader', _('Tags'), 'icon-tags', null, null, {
				toggleblock: 1,
			})
		);

		if (this.props.tags.length) {
			const result = shared.renderTags(this.props, this.renderTag.bind(this));
			const tagItems = result.items;
			this.tagItemsOrder_ = result.order;

			items.push(
				<div className="tags" key="tag_items" style={{ display: this.state.tagHeaderIsExpanded ? 'block' : 'none' }}>
					{tagItems}
				</div>
			);
		}

		let decryptionReportText = '';
		if (this.props.decryptionWorker && this.props.decryptionWorker.state !== 'idle' && this.props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', this.props.decryptionWorker.itemIndex + 1, this.props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (this.props.resourceFetcher && this.props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', this.props.resourceFetcher.fetchingCount, this.props.resourceFetcher.toFetchCount);
		}

		const lines = Synchronizer.reportToLines(this.props.syncReport);
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

		const syncButton = this.renderSynchronizeButton(this.props.syncStarted ? 'cancel' : 'sync');

		const syncReportComp = !syncReportText.length ? null : (
			<StyledSyncReport key="sync_report">
				{syncReportText}
			</StyledSyncReport>
		);

		return (
			<StyledRoot ref={this.rootRef} onKeyDown={this.onKeyDown} className="sidebar">
				<div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{items}</div>
				<div style={{ flex: 0, padding: theme.mainPadding }}>
					{syncReportComp}
					{syncButton}
				</div>
			</StyledRoot>
		);
	}
}

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
	};
};

export default connect(mapStateToProps)(SidebarComponent);
