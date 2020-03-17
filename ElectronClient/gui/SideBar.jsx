const React = require('react');
const { connect } = require('react-redux');
const shared = require('lib/components/shared/side-menu-shared.js');
const { Synchronizer } = require('lib/synchronizer.js');
const BaseModel = require('lib/BaseModel.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const InteropServiceHelper = require('../InteropServiceHelper.js');
const { substrWithEllipsis } = require('lib/string-utils');
const { ALL_NOTES_FILTER_ID } = require('lib/reserved-ids');

class SideBarComponent extends React.Component {
	constructor() {
		super();

		this.onFolderDragStart_ = event => {
			const folderId = event.currentTarget.getAttribute('folderid');
			if (!folderId) return;

			event.dataTransfer.setDragImage(new Image(), 1, 1);
			event.dataTransfer.clearData();
			event.dataTransfer.setData('text/x-jop-folder-ids', JSON.stringify([folderId]));
		};

		this.onFolderDragOver_ = event => {
			if (event.dataTransfer.types.indexOf('text/x-jop-note-ids') >= 0) event.preventDefault();
			if (event.dataTransfer.types.indexOf('text/x-jop-folder-ids') >= 0) event.preventDefault();
		};

		this.onFolderDrop_ = async event => {
			const folderId = event.currentTarget.getAttribute('folderid');
			const dt = event.dataTransfer;
			if (!dt) return;

			// folderId can be NULL when dropping on the sidebar Notebook header. In that case, it's used
			// to put the dropped folder at the root. But for notes, folderId needs to always be defined
			// since there's no such thing as a root note.

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
		};

		this.onTagDrop_ = async event => {
			const tagId = event.currentTarget.getAttribute('tagid');
			const dt = event.dataTransfer;
			if (!dt) return;

			if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
				event.preventDefault();

				const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));
				for (let i = 0; i < noteIds.length; i++) {
					await Tag.addNote(tagId, noteIds[i]);
				}
			}
		};

		this.onFolderToggleClick_ = async event => {
			const folderId = event.currentTarget.getAttribute('folderid');

			this.props.dispatch({
				type: 'FOLDER_TOGGLE',
				id: folderId,
			});
		};

		this.folderItemsOrder_ = [];
		this.tagItemsOrder_ = [];

		this.onKeyDown = this.onKeyDown.bind(this);
		this.onAllNotesClick_ = this.onAllNotesClick_.bind(this);

		this.rootRef = React.createRef();

		this.anchorItemRefs = {};

		this.state = {
			tagHeaderIsExpanded: Setting.value('tagHeaderIsExpanded'),
			folderHeaderIsExpanded: Setting.value('folderHeaderIsExpanded'),
		};
	}

	style(depth) {
		const theme = themeStyle(this.props.theme);

		const itemHeight = 25;

		const style = {
			root: {
				backgroundColor: theme.backgroundColor2,
			},
			listItemContainer: {
				boxSizing: 'border-box',
				height: itemHeight,
				// paddingLeft: 14,
				display: 'flex',
				alignItems: 'stretch',
				// Allow 3 levels of color depth
				backgroundColor: theme.depthColor.replace('OPACITY', Math.min(depth * 0.1, 0.3)),
			},
			listItem: {
				fontFamily: theme.fontFamily,
				fontSize: theme.fontSize,
				textDecoration: 'none',
				color: theme.color2,
				cursor: 'default',
				opacity: 0.8,
				whiteSpace: 'nowrap',
				display: 'flex',
				flex: 1,
				alignItems: 'center',
			},
			listItemSelected: {
				backgroundColor: theme.selectedColor2,
			},
			listItemExpandIcon: {
				color: theme.color2,
				cursor: 'default',
				opacity: 0.8,
				// fontFamily: theme.fontFamily,
				fontSize: theme.fontSize,
				textDecoration: 'none',
				paddingRight: 5,
				display: 'flex',
				alignItems: 'center',
			},
			conflictFolder: {
				color: theme.colorError2,
				fontWeight: 'bold',
			},
			header: {
				height: itemHeight * 1.8,
				fontFamily: theme.fontFamily,
				fontSize: theme.fontSize * 1.16,
				textDecoration: 'none',
				boxSizing: 'border-box',
				color: theme.color2,
				paddingLeft: 8,
				display: 'flex',
				alignItems: 'center',
			},
			button: {
				padding: 6,
				fontFamily: theme.fontFamily,
				fontSize: theme.fontSize,
				textDecoration: 'none',
				boxSizing: 'border-box',
				color: theme.color2,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: '1px solid rgba(255,255,255,0.2)',
				marginTop: 10,
				marginLeft: 5,
				marginRight: 5,
				cursor: 'default',
			},
			syncReport: {
				fontFamily: theme.fontFamily,
				fontSize: Math.round(theme.fontSize * 0.9),
				color: theme.color2,
				opacity: 0.5,
				display: 'flex',
				alignItems: 'left',
				justifyContent: 'top',
				flexDirection: 'column',
				marginTop: 10,
				marginLeft: 5,
				marginRight: 5,
				marginBottom: 10,
				wordWrap: 'break-word',
			},
			noteCount: {
				paddingLeft: 5,
				opacity: 0.5,
			},
		};

		style.tagItem = Object.assign({}, style.listItem);
		style.tagItem.paddingLeft = 23;
		style.tagItem.height = itemHeight;

		return style;
	}

	clearForceUpdateDuringSync() {
		if (this.forceUpdateDuringSyncIID_) {
			clearInterval(this.forceUpdateDuringSyncIID_);
			this.forceUpdateDuringSyncIID_ = null;
		}
	}

	doCommand(command) {
		if (!command) return;

		let commandProcessed = true;

		if (command.name === 'focusElement' && command.target === 'sideBar') {
			if (this.props.sidebarVisibility) {
				const item = this.selectedItem();
				if (item) {
					const anchorRef = this.anchorItemRefs[item.type][item.id];
					if (anchorRef) anchorRef.current.focus();
				} else {
					const anchorRef = this.firstAnchorItemRef('folder');
					console.info('anchorRef', anchorRef);
					if (anchorRef) anchorRef.current.focus();
				}
			}
		} else if (command.name === 'synchronize') {
			if (!this.props.syncStarted) this.sync_click();
		} else {
			commandProcessed = false;
		}

		if (commandProcessed) {
			this.props.dispatch({
				type: 'WINDOW_COMMAND',
				name: null,
			});
		}
	}

	componentWillUnmount() {
		this.clearForceUpdateDuringSync();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.windowCommand !== this.props.windowCommand) {
			this.doCommand(this.props.windowCommand);
		}

		// if (shim.isLinux()) {
		// 	// For some reason, the UI seems to sleep in some Linux distro during
		// 	// sync. Cannot find the reason for it and cannot replicate, so here
		// 	// as a test force the update at regular intervals.
		// 	// https://github.com/laurent22/joplin/issues/312#issuecomment-429472193
		// 	if (!prevProps.syncStarted && this.props.syncStarted) {
		// 		this.clearForceUpdateDuringSync();

		// 		this.forceUpdateDuringSyncIID_ = setInterval(() => {
		// 			this.forceUpdate();
		// 		}, 2000);
		// 	}

		// 	if (prevProps.syncStarted && !this.props.syncStarted) this.clearForceUpdateDuringSync();
		// }
	}

	async itemContextMenu(event) {
		const itemId = event.currentTarget.getAttribute('data-id');
		if (itemId === Folder.conflictFolderId()) return;

		const itemType = Number(event.currentTarget.getAttribute('data-type'));
		if (!itemId || !itemType) throw new Error('No data on element');

		let deleteMessage = '';
		let buttonLabel = _('Remove');
		if (itemType === BaseModel.TYPE_FOLDER) {
			const folder = await Folder.load(itemId);
			deleteMessage = _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', substrWithEllipsis(folder.title, 0, 32));
			buttonLabel = _('Delete');
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
				new MenuItem({
					label: _('New sub-notebook'),
					click: () => {
						this.props.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'newSubNotebook',
							activeFolderId: itemId,
						});
					},
				})
			);
		}

		menu.append(
			new MenuItem({
				label: buttonLabel,
				click: async () => {
					const ok = bridge().showConfirmMessageBox(deleteMessage, {
						buttons: [buttonLabel, _('Cancel')],
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
			menu.append(
				new MenuItem({
					label: _('Rename'),
					click: async () => {
						this.props.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'renameFolder',
							id: itemId,
						});
					},
				})
			);

			// menu.append(
			// 	new MenuItem({
			// 		label: _("Move"),
			// 		click: async () => {
			// 			this.props.dispatch({
			// 				type: "WINDOW_COMMAND",
			// 				name: "renameFolder",
			// 				id: itemId,
			// 			});
			// 		},
			// 	})
			// );

			menu.append(new MenuItem({ type: 'separator' }));

			const InteropService = require('lib/services/InteropService.js');

			const exportMenu = new Menu();
			const ioService = new InteropService();
			const ioModules = ioService.modules();
			for (let i = 0; i < ioModules.length; i++) {
				const module = ioModules[i];
				if (module.type !== 'exporter') continue;

				exportMenu.append(
					new MenuItem({
						label: module.fullLabel(),
						click: async () => {
							await InteropServiceHelper.export(this.props.dispatch.bind(this), module, { sourceFolderIds: [itemId] });
						},
					})
				);
			}

			menu.append(
				new MenuItem({
					label: _('Export'),
					submenu: exportMenu,
				})
			);
		}

		if (itemType === BaseModel.TYPE_TAG) {
			menu.append(
				new MenuItem({
					label: _('Rename'),
					click: async () => {
						this.props.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'renameTag',
							id: itemId,
						});
					},
				})
			);
		}

		menu.popup(bridge().window());
	}

	folderItem_click(folder) {
		this.props.dispatch({
			type: 'FOLDER_SELECT',
			id: folder ? folder.id : null,
			historyAction: 'goto',
		});
	}

	tagItem_click(tag) {
		this.props.dispatch({
			type: 'TAG_SELECT',
			id: tag ? tag.id : null,
		});
	}

	async sync_click() {
		await shared.synchronize_press(this);
	}

	anchorItemRef(type, id) {
		if (!this.anchorItemRefs[type]) this.anchorItemRefs[type] = {};
		if (this.anchorItemRefs[type][id]) return this.anchorItemRefs[type][id];
		this.anchorItemRefs[type][id] = React.createRef();
		return this.anchorItemRefs[type][id];
	}

	firstAnchorItemRef(type) {
		const refs = this.anchorItemRefs[type];
		if (!refs) return null;

		const n = `${type}s`;
		const item = this.props[n] && this.props[n].length ? this.props[n][0] : null;
		console.info('props', this.props[n], item);
		if (!item) return null;

		return refs[item.id];
	}

	noteCountElement(count) {
		return <div style={this.style().noteCount}>({count})</div>;
	}

	folderItem(folder, selected, hasChildren, depth) {
		let style = Object.assign({}, this.style().listItem);
		if (folder.id === Folder.conflictFolderId()) style = Object.assign(style, this.style().conflictFolder);

		const itemTitle = Folder.displayTitle(folder);

		let containerStyle = Object.assign({}, this.style(depth).listItemContainer);
		if (selected) containerStyle = Object.assign(containerStyle, this.style().listItemSelected);

		const expandLinkStyle = Object.assign({}, this.style().listItemExpandIcon);
		const expandIconStyle = {
			visibility: hasChildren ? 'visible' : 'hidden',
			paddingLeft: 8 + depth * 10,
		};

		const iconName = this.props.collapsedFolderIds.indexOf(folder.id) >= 0 ? 'fa-plus-square' : 'fa-minus-square';
		const expandIcon = <i style={expandIconStyle} className={`fa ${iconName}`}></i>;
		const expandLink = hasChildren ? (
			<a style={expandLinkStyle} href="#" folderid={folder.id} onClick={this.onFolderToggleClick_}>
				{expandIcon}
			</a>
		) : (
			<span style={expandLinkStyle}>{expandIcon}</span>
		);

		const anchorRef = this.anchorItemRef('folder', folder.id);
		const noteCount = folder.note_count ? this.noteCountElement(folder.note_count) : '';

		return (
			<div className="list-item-container" style={containerStyle} key={folder.id} onDragStart={this.onFolderDragStart_} onDragOver={this.onFolderDragOver_} onDrop={this.onFolderDrop_} draggable={true} folderid={folder.id}>
				{expandLink}
				<a
					ref={anchorRef}
					className="list-item"
					href="#"
					data-id={folder.id}
					data-type={BaseModel.TYPE_FOLDER}
					onContextMenu={event => this.itemContextMenu(event)}
					style={style}
					folderid={folder.id}
					onClick={() => {
						this.folderItem_click(folder);
					}}
					onDoubleClick={this.onFolderToggleClick_}
				>
					{itemTitle} {noteCount}
				</a>
			</div>
		);
	}

	tagItem(tag, selected) {
		let style = Object.assign({}, this.style().tagItem);
		if (selected) style = Object.assign(style, this.style().listItemSelected);

		const anchorRef = this.anchorItemRef('tag', tag.id);
		const noteCount = Setting.value('showNoteCounts') ? this.noteCountElement(tag.note_count) : '';

		return (
			<a
				className="list-item"
				href="#"
				ref={anchorRef}
				data-id={tag.id}
				data-type={BaseModel.TYPE_TAG}
				onContextMenu={event => this.itemContextMenu(event)}
				tagid={tag.id}
				key={tag.id}
				style={style}
				onDrop={this.onTagDrop_}
				onClick={() => {
					this.tagItem_click(tag);
				}}
			>
				{Tag.displayTitle(tag)} {noteCount}
			</a>
		);
	}

	// searchItem(search, selected) {
	// 	let style = Object.assign({}, this.style().listItem);
	// 	if (selected) style = Object.assign(style, this.style().listItemSelected);
	// 	return (
	// 		<a
	// 			className="list-item"
	// 			href="#"
	// 			data-id={search.id}
	// 			data-type={BaseModel.TYPE_SEARCH}
	// 			onContextMenu={event => this.itemContextMenu(event)}
	// 			key={search.id}
	// 			style={style}
	// 			onClick={() => {
	// 				this.searchItem_click(search);
	// 			}}
	// 		>
	// 			{search.title}
	// 		</a>
	// 	);
	// }

	makeDivider(key) {
		return <div style={{ height: 2, backgroundColor: 'blue' }} key={key} />;
	}

	makeHeader(key, label, iconName, extraProps = {}) {
		const style = this.style().header;
		const icon = <i style={{ fontSize: style.fontSize, marginRight: 5 }} className={`fa ${iconName}`} />;

		if (extraProps.toggleblock || extraProps.onClick) {
			style.cursor = 'pointer';
		}

		const headerClick = extraProps.onClick || null;
		delete extraProps.onClick;

		// check if toggling option is set.
		let toggleIcon = null;
		const toggleKey = `${key}IsExpanded`;
		if (extraProps.toggleblock) {
			const isExpanded = this.state[toggleKey];
			toggleIcon = <i className={`fa ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-left'}`} style={{ fontSize: style.fontSize * 0.75, marginRight: 12, marginLeft: 5, marginTop: style.fontSize * 0.125 }}></i>;
		}
		if (extraProps.selected) {
			style.backgroundColor = this.style().listItemSelected.backgroundColor;
		}

		const ref = this.anchorItemRef('headers', key);

		return (
			<div
				ref={ref}
				style={style}
				key={key}
				{...extraProps}
				onClick={event => {
					// if a custom click event is attached, trigger that.
					if (headerClick) {
						headerClick(key, event);
					}
					this.onHeaderClick_(key, event);
				}}
			>
				{icon}
				<span style={{ flex: 1 }}>{label}</span>
				{toggleIcon}
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

	onKeyDown(event) {
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
				this.props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteBody',
				});
			} else {
				this.props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteList',
				});
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

	onHeaderClick_(key, event) {
		const currentHeader = event.currentTarget;
		const toggleBlock = +currentHeader.getAttribute('toggleblock');
		if (toggleBlock) {
			const toggleKey = `${key}IsExpanded`;
			const isExpanded = this.state[toggleKey];
			this.setState({ [toggleKey]: !isExpanded });
			Setting.setValue(toggleKey, !isExpanded);
		}
	}

	onAllNotesClick_() {
		this.props.dispatch({
			type: 'SMART_FILTER_SELECT',
			id: ALL_NOTES_FILTER_ID,
		});
	}

	synchronizeButton(type) {
		const style = Object.assign({}, this.style().button, { marginBottom: 5 });
		const iconName = 'fa-refresh';
		const label = type === 'sync' ? _('Synchronise') : _('Cancel');
		const iconStyle = { fontSize: style.fontSize, marginRight: 5 };

		if (type !== 'sync') {
			iconStyle.animation = 'icon-infinite-rotation 1s linear infinite';
		}

		const icon = <i style={iconStyle} className={`fa ${iconName}`} />;
		return (
			<a
				className="synchronize-button"
				style={style}
				href="#"
				key="sync_button"
				onClick={() => {
					this.sync_click();
				}}
			>
				{icon}
				{label}
			</a>
		);
	}

	render() {
		const style = Object.assign({}, this.style().root, this.props.style, {
			overflowX: 'hidden',
			overflowY: 'hidden',
			display: 'inline-flex',
			flexDirection: 'column',
		});

		const items = [];
		items.push(
			this.makeHeader('allNotesHeader', _('All notes'), 'fa-clone', {
				onClick: this.onAllNotesClick_,
				selected: this.props.notesParentType === 'SmartFilter' && this.props.selectedSmartFilterId === ALL_NOTES_FILTER_ID,
			})
		);

		items.push(
			this.makeHeader('folderHeader', _('Notebooks'), 'fa-book', {
				onDrop: this.onFolderDrop_,
				folderid: '',
				toggleblock: 1,
			})
		);

		if (this.props.folders.length) {
			const result = shared.renderFolders(this.props, this.folderItem.bind(this));
			const folderItems = result.items;
			this.folderItemsOrder_ = result.order;
			items.push(
				<div className="folders" key="folder_items" style={{ display: this.state.folderHeaderIsExpanded ? 'block' : 'none' }}>
					{folderItems}
				</div>
			);
		}

		items.push(
			this.makeHeader('tagHeader', _('Tags'), 'fa-tags', {
				toggleblock: 1,
			})
		);

		if (this.props.tags.length) {
			const result = shared.renderTags(this.props, this.tagItem.bind(this));
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
				<div key={i} style={{ wordWrap: 'break-word', width: '100%' }}>
					{lines[i]}
				</div>
			);
		}

		const syncButton = this.synchronizeButton(this.props.syncStarted ? 'cancel' : 'sync');

		const syncReportComp = !syncReportText.length ? null : (
			<div style={this.style().syncReport} key="sync_report">
				{syncReportText}
			</div>
		);

		return (
			<div ref={this.rootRef} onKeyDown={this.onKeyDown} className="side-bar" style={style}>
				<div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>{items}</div>
				<div style={{ flex: 0 }}>
					{syncReportComp}
					{syncButton}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
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
		theme: state.settings.theme,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		windowCommand: state.windowCommand,
		sidebarVisibility: state.sidebarVisibility,
		noteListVisibility: state.noteListVisibility,
	};
};

const SideBar = connect(mapStateToProps)(SideBarComponent);

module.exports = { SideBar };
