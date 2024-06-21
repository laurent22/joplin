import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AppState } from '../app.reducer';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { stateUtils } from '@joplin/lib/reducer';
import CommandService from '@joplin/lib/services/CommandService';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import KeymapService from '@joplin/lib/services/KeymapService';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import versionInfo, { PackageInfo } from '@joplin/lib/versionInfo';
import makeDiscourseDebugUrl from '@joplin/lib/makeDiscourseDebugUrl';
import { ImportModule } from '@joplin/lib/services/interop/Module';
import InteropServiceHelper from '../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import { isContextMenuItemLocation, MenuItem, MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import menuCommandNames from './menuCommandNames';
import stateToWhenClauseContext from '../services/commands/stateToWhenClauseContext';
import bridge from '../services/bridge';
import checkForUpdates from '../checkForUpdates';
const { connect } = require('react-redux');
import { reg } from '@joplin/lib/registry';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { getListRendererById, getListRendererIds } from '@joplin/lib/services/noteList/renderers';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { EventName } from '@joplin/lib/eventManager';
const packageInfo: PackageInfo = require('../packageInfo.js');
const { clipboard } = require('electron');
const Menu = bridge().Menu;

const menuUtils = new MenuUtils(CommandService.instance());

function pluginMenuItemsCommandNames(menuItems: MenuItem[]): string[] {
	let output: string[] = [];
	for (const menuItem of menuItems) {
		if (menuItem.submenu) {
			output = output.concat(pluginMenuItemsCommandNames(menuItem.submenu));
		} else {
			if (menuItem.commandName) output.push(menuItem.commandName);
		}
	}
	return output;
}

function getPluginCommandNames(plugins: PluginStates): string[] {
	let output: string[] = [];

	for (const view of pluginUtils.viewsByType(plugins, 'menu')) {
		output = output.concat(pluginMenuItemsCommandNames(view.menuItems));
	}

	for (const view of pluginUtils.viewsByType(plugins, 'menuItem')) {
		if (view.commandName) output.push(view.commandName);
	}

	return output;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function createPluginMenuTree(label: string, menuItems: MenuItem[], onMenuItemClick: Function) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {
		label: label,
		submenu: [],
	};

	for (const menuItem of menuItems) {
		if (menuItem.submenu) {
			output.submenu.push(createPluginMenuTree(menuItem.label, menuItem.submenu, onMenuItemClick));
		} else {
			output.submenu.push(menuUtils.commandToMenuItem(menuItem.commandName, onMenuItemClick));
		}
	}

	return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const useSwitchProfileMenuItems = (profileConfig: ProfileConfig, menuItemDic: any) => {
	return useMemo(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const switchProfileMenuItems: any[] = [];

		for (let i = 0; i < profileConfig.profiles.length; i++) {
			const profile = profileConfig.profiles[i];

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let menuItem: any = {};
			const profileNum = i + 1;

			if (menuItemDic[`switchProfile${profileNum}`]) {
				menuItem = { ...menuItemDic[`switchProfile${profileNum}`] };
			} else {
				menuItem = {
					label: profile.name,
					click: () => {
						void CommandService.instance().execute('switchProfile', profile.id);
					},
				};
			}

			menuItem.label = profile.name;
			menuItem.type = 'checkbox';
			menuItem.checked = profileConfig.currentProfileId === profile.id;

			switchProfileMenuItems.push(menuItem);
		}

		switchProfileMenuItems.push({ type: 'separator' });
		switchProfileMenuItems.push(menuItemDic.addProfile);
		switchProfileMenuItems.push(menuItemDic.editProfileConfig);

		return switchProfileMenuItems;
	}, [profileConfig, menuItemDic]);
};

const useNoteListMenuItems = (noteListRendererIds: string[]) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const [menuItems, setMenuItems] = useState<any[]>([]);

	useAsyncEffect(async (event) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any[] = [];
		for (const id of noteListRendererIds) {
			const renderer = getListRendererById(id);

			output.push({
				id: `noteListRenderer_${id}`,
				label: await renderer.label(),
				type: 'checkbox',
				click: () => {
					Setting.setValue('notes.listRendererId', id);
				},
			});

			if (event.cancelled) return;
		}

		setMenuItems(output);
	}, [noteListRendererIds]);

	return menuItems;
};

interface Props {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	menuItemProps: any;
	routeName: string;
	selectedFolderId: string;
	layoutButtonSequence: number;
	['notes.sortOrder.field']: string;
	['folders.sortOrder.field']: string;
	['notes.sortOrder.reverse']: boolean;
	['folders.sortOrder.reverse']: boolean;
	showNoteCounts: boolean;
	uncompletedTodosOnTop: boolean;
	showCompletedTodos: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginMenuItems: any[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginMenus: any[];
	['spellChecker.enabled']: boolean;
	['spellChecker.languages']: string[];
	plugins: PluginStates;
	customCss: string;
	locale: string;
	profileConfig: ProfileConfig;
	pluginSettings: PluginSettings;
	noteListRendererIds: string[];
	noteListRendererId: string;
	showMenuBar: boolean;
}

const commandNames: string[] = menuCommandNames();

function menuItemSetChecked(id: string, checked: boolean) {
	const menu = Menu.getApplicationMenu();
	const menuItem = menu.getMenuItemById(id);
	if (!menuItem) return;
	menuItem.checked = checked;
}

function menuItemSetEnabled(id: string, enabled: boolean) {
	const menu = Menu.getApplicationMenu();
	const menuItem = menu.getMenuItemById(id);
	if (!menuItem) return;
	menuItem.enabled = enabled;
}

const applyMenuBarVisibility = (showMenuBar: boolean) => {
	// The menu bar cannot be hidden on macOS
	if (shim.isMac()) return;

	const window = bridge().window();
	window.setAutoHideMenuBar(!showMenuBar);
	window.setMenuBarVisibility(showMenuBar);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function useMenuStates(menu: any, props: Props) {
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let timeoutId: any = null;

		function scheduleUpdate() {
			if (!timeoutId) return; // Was cancelled
			timeoutId = null;

			const whenClauseContext = CommandService.instance().currentWhenClauseContext();

			for (const commandName in props.menuItemProps) {
				const p = props.menuItemProps[commandName];
				if (!p) continue;
				const enabled = 'enabled' in p ? p.enabled : CommandService.instance().isEnabled(commandName, whenClauseContext);
				menuItemSetEnabled(commandName, enabled);
			}

			const layoutButtonSequenceOptions = Setting.enumOptions('layoutButtonSequence');
			for (const value in layoutButtonSequenceOptions) {
				menuItemSetChecked(`layoutButtonSequence_${value}`, props.layoutButtonSequence === Number(value));
			}

			const listRendererIds = getListRendererIds();
			for (const id of listRendererIds) {
				menuItemSetChecked(`noteListRenderer_${id}`, props.noteListRendererId === id);
			}

			function applySortItemCheckState(type: string) {
				const sortOptions = Setting.enumOptions(`${type}.sortOrder.field`);
				for (const field in sortOptions) {
					if (!sortOptions.hasOwnProperty(field)) continue;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					menuItemSetChecked(`sort:${type}:${field}`, (props as any)[`${type}.sortOrder.field`] === field);
				}

				const id = type === 'notes' ? 'toggleNotesSortOrderReverse' : `sort:${type}:reverse`;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				menuItemSetChecked(id, (props as any)[`${type}.sortOrder.reverse`]);
			}

			applySortItemCheckState('notes');
			applySortItemCheckState('folders');

			menuItemSetChecked('showNoteCounts', props.showNoteCounts);
			menuItemSetChecked('uncompletedTodosOnTop', props.uncompletedTodosOnTop);
			menuItemSetChecked('showCompletedTodos', props.showCompletedTodos);
		}

		timeoutId = setTimeout(scheduleUpdate, 150);

		return () => {
			clearTimeout(timeoutId);
			timeoutId = null;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [
		props.menuItemProps,
		props.layoutButtonSequence,
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['notes.sortOrder.field'],
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['folders.sortOrder.field'],
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['notes.sortOrder.reverse'],
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['folders.sortOrder.reverse'],
		props.noteListRendererId,
		props.showNoteCounts,
		props.uncompletedTodosOnTop,
		props.showCompletedTodos,
		menu,
	]);
}

function useMenu(props: Props) {
	const [menu, setMenu] = useState(null);
	const [keymapLastChangeTime, setKeymapLastChangeTime] = useState(Date.now());
	const [modulesLastChangeTime, setModulesLastChangeTime] = useState(Date.now());

	// We use a ref here because the plugin state can change frequently when
	// switching note since any plugin view might be rendered again. However we
	// need this plugin state only in a click handler when exporting notes, and
	// for that a ref is sufficient.
	const pluginsRef = useRef(props.plugins);

	const onMenuItemClick = useCallback((commandName: string) => {
		void CommandService.instance().execute(commandName);
	}, []);

	const onImportModuleClick = useCallback(async (module: ImportModule, moduleSource: string) => {
		let path = null;

		if (moduleSource === 'file') {
			path = await bridge().showOpenDialog({
				filters: [{ name: module.description, extensions: module.fileExtensions }],
			});
		} else {
			path = await bridge().showOpenDialog({
				properties: ['openDirectory', 'createDirectory'],
			});
		}

		if (!path || (Array.isArray(path) && !path.length)) return;

		if (Array.isArray(path)) path = path[0];

		const modalMessage = _('Importing from "%s" as "%s" format. Please wait...', path, module.format);

		void CommandService.instance().execute('showModalMessage', modalMessage);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const errors: any[] = [];

		const importOptions = {
			path,
			format: module.format,
			outputFormat: module.outputFormat,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			onProgress: (status: any) => {
				const statusStrings: string[] = Object.keys(status).map((key: string) => {
					return `${key}: ${status[key]}`;
				});

				void CommandService.instance().execute('showModalMessage', `${modalMessage}\n\n${statusStrings.join('\n')}`);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			onError: (error: any) => {
				errors.push(error);
				console.warn(error);
			},
			destinationFolderId: !module.isNoteArchive && moduleSource === 'file' ? props.selectedFolderId : null,
		};

		const service = InteropService.instance();
		try {
			const result = await service.import(importOptions);
			// eslint-disable-next-line no-console
			console.info('Import result: ', result);
		} catch (error) {
			bridge().showErrorMessageBox(error.message);
		}

		void CommandService.instance().execute('hideModalMessage');

		if (errors.length) {
			const response = bridge().showErrorMessageBox('There was some errors importing the notes - check the console for more details.\n\nPlease consider sending a bug report to the forum!', {
				buttons: [_('Close'), _('Send bug report')],
			});

			props.dispatch({ type: 'NOTE_DEVTOOLS_SET', value: true });

			if (response === 1) {
				const url = makeDiscourseDebugUrl(
					`Error importing notes from format: ${module.format}`,
					`- Input format: ${module.format}\n- Output format: ${module.outputFormat}`,
					errors,
					packageInfo,
					PluginService.instance(),
					props.pluginSettings,
				);

				void bridge().openExternal(url);
			}
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.selectedFolderId, props.pluginSettings]);

	const onMenuItemClickRef = useRef(null);
	onMenuItemClickRef.current = onMenuItemClick;

	const onImportModuleClickRef = useRef(null);
	onImportModuleClickRef.current = onImportModuleClick;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const pluginCommandNames = useMemo(() => props.pluginMenuItems.map((view: any) => view.commandName), [props.pluginMenuItems]);

	const menuItemDic = useMemo(() => {
		return menuUtils.commandsToMenuItems(
			commandNames.concat(pluginCommandNames),
			(commandName: string) => onMenuItemClickRef.current(commandName),
			props.locale,
		);
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [commandNames, pluginCommandNames, props.locale]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const switchProfileMenuItems: any[] = useSwitchProfileMenuItems(props.profileConfig, menuItemDic);

	const noteListMenuItems = useNoteListMenuItems(props.noteListRendererIds);

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let timeoutId: any = null;

		function updateMenu() {
			if (!timeoutId) return; // Has been cancelled

			const keymapService = KeymapService.instance();

			const quitMenuItem = {
				label: _('Quit'),
				accelerator: keymapService.getAccelerator('quit'),
				click: () => { void bridge().electronApp().quit(); },
			};

			const sortNoteFolderItems = (type: string) => {
				const sortItems = [];
				const sortOptions = Setting.enumOptions(`${type}.sortOrder.field`);
				for (const field in sortOptions) {
					if (!sortOptions.hasOwnProperty(field)) continue;
					sortItems.push({
						id: `sort:${type}:${field}`,
						label: sortOptions[field],
						type: 'checkbox',
						// checked: Setting.value(`${type}.sortOrder.field`) === field,
						click: () => {
							if (type === 'notes') {
								void CommandService.instance().execute('toggleNotesSortOrderField', field);
							} else {
								Setting.setValue(`${type}.sortOrder.field`, field);
							}
						},
					});
				}

				sortItems.push({ type: 'separator' });

				if (type === 'notes') {
					sortItems.push(
						{ ...menuItemDic.toggleNotesSortOrderReverse, type: 'checkbox' },
						{ ...menuItemDic.toggleNotesSortOrderField, visible: false },
					);
				} else {
					sortItems.push({
						id: `sort:${type}:reverse`,
						label: Setting.settingMetadata(`${type}.sortOrder.reverse`).label(),
						type: 'checkbox',
						// checked: Setting.value(`${type}.sortOrder.reverse`),
						click: () => {
							Setting.setValue(`${type}.sortOrder.reverse`, !Setting.value(`${type}.sortOrder.reverse`));
						},
					});
				}

				return sortItems;
			};

			const sortNoteItems = sortNoteFolderItems('notes');
			const sortFolderItems = sortNoteFolderItems('folders');

			const focusItems = [
				menuItemDic.focusElementSideBar,
				menuItemDic.focusElementNoteList,
				menuItemDic.focusElementNoteTitle,
				menuItemDic.focusElementNoteBody,
			];

			const importItems = [];
			const exportItems = [];
			const ioService = InteropService.instance();
			const ioModules = ioService.modules();
			for (let i = 0; i < ioModules.length; i++) {
				const module = ioModules[i];
				if (module.type === 'exporter') {
					if (module.isNoteArchive !== false) {
						exportItems.push({
							label: module.fullLabel(),
							click: async () => {
								await InteropServiceHelper.export(
									// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
									(action: any) => props.dispatch(action),
									module,
									{
										plugins: pluginsRef.current,
										customCss: props.customCss,
									},
								);
							},
						});
					}
				} else {
					for (let j = 0; j < module.sources.length; j++) {
						const moduleSource = module.sources[j];
						importItems.push({
							label: module.fullLabel(moduleSource),
							click: () => onImportModuleClickRef.current(module, moduleSource),
						});
						if (module.separatorAfter) importItems.push({ type: 'separator' });
					}
				}
			}

			importItems.push({ type: 'separator' });
			importItems.push({
				label: _('Other applications...'),
				click: () => { void bridge().openExternal('https://discourse.joplinapp.org/t/importing-notes-from-other-notebook-applications/22425'); },
			});

			exportItems.push(
				menuItemDic.exportPdf,
			);

			// We need a dummy entry, otherwise the ternary operator to show a
			// menu item only on a specific OS does not work.
			const noItem = {
				type: 'separator',
				visible: false,
			};

			const syncStatusItem = {
				label: _('Synchronisation Status'),
				click: () => {
					props.dispatch({
						type: 'NAV_GO',
						routeName: 'Status',
					});
				},
			};

			const separator = () => {
				return {
					type: 'separator',
				};
			};

			const newNoteItem = menuItemDic.newNote;
			const newTodoItem = menuItemDic.newTodo;
			const newFolderItem = menuItemDic.newFolder;
			const newSubFolderItem = menuItemDic.newSubFolder;
			const printItem = menuItemDic.print;
			const switchProfileItem = {
				label: _('Switch profile'),
				submenu: switchProfileMenuItems,
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let toolsItems: any[] = [];

			// we need this workaround, because on macOS the menu is different
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const toolsItemsWindowsLinux: any[] = [
				{
					label: _('Options'),
					accelerator: keymapService.getAccelerator('config'),
					click: () => {
						props.dispatch({
							type: 'NAV_GO',
							routeName: 'Config',
						});
					},
				},
				separator(),
			];

			// the following menu items will be available for all OS under Tools
			const toolsItemsAll = [{
				label: _('Note attachments...'),
				click: () => {
					props.dispatch({
						type: 'NAV_GO',
						routeName: 'Resources',
					});
				},
			}];

			if (!shim.isMac()) {
				toolsItems = toolsItems.concat(toolsItemsWindowsLinux);
			}
			toolsItems = toolsItems.concat(toolsItemsAll);

			toolsItems.push(SpellCheckerService.instance().spellCheckerConfigMenuItem(props['spellChecker.languages'], props['spellChecker.enabled']));

			function _checkForUpdates() {
				void checkForUpdates(false, bridge().window(), { includePreReleases: Setting.value('autoUpdate.includePreReleases') });
			}

			function _showAbout() {
				const v = versionInfo(packageInfo, PluginService.instance().enabledPlugins(props.pluginSettings));

				const copyToClipboard = bridge().showMessageBox(v.message, {
					icon: `${bridge().electronApp().buildDir()}/icons/128x128.png`,
					buttons: [_('Copy'), _('OK')],
					cancelId: 1,
					defaultId: 1,
				});

				if (copyToClipboard === 0) {
					clipboard.writeText(v.body);
				}
			}

			const rootMenuFile = {
				// Using a dummy entry for macOS here, because first menu
				// becomes 'Joplin' and we need a menu called 'File' later.
				label: shim.isMac() ? '&JoplinMainMenu' : _('&File'),
				// `&` before one of the char in the label name mean, that
				// <Alt + F> will open this menu. It's needed because electron
				// opens the first menu on Alt press if no hotkey assigned.
				// Issue: https://github.com/laurent22/joplin/issues/934
				submenu: [{
					label: _('About Joplin'),
					visible: !!shim.isMac(),
					click: () => _showAbout(),
				}, {
					type: 'separator',
					visible: !!shim.isMac(),
				}, {
					label: _('Preferences...'),
					visible: !!shim.isMac(),
					accelerator: shim.isMac() && keymapService.getAccelerator('config'),
					click: () => {
						props.dispatch({
							type: 'NAV_GO',
							routeName: 'Config',
						});
					},
				}, {
					label: _('Check for updates...'),
					visible: !!shim.isMac(),
					click: () => _checkForUpdates(),
				}, {
					type: 'separator',
					visible: !!shim.isMac(),
				},
				shim.isMac() ? noItem : newNoteItem,
				shim.isMac() ? noItem : newTodoItem,
				shim.isMac() ? noItem : newFolderItem,
				shim.isMac() ? noItem : newSubFolderItem,
				{
					type: 'separator',
					visible: !shim.isMac(),
				}, {
					label: _('Import'),
					visible: !shim.isMac(),
					submenu: importItems,
				}, {
					label: _('Export all'),
					visible: !shim.isMac(),
					submenu: exportItems,
				}, {
					type: 'separator',
				},

				menuItemDic.synchronize,

				shim.isMac() ? noItem : printItem, {
					type: 'separator',
					platforms: ['darwin'],
				},

				shim.isMac() ? noItem : switchProfileItem,

				shim.isMac() ? {
					label: _('Hide %s', 'Joplin'),
					platforms: ['darwin'],
					accelerator: shim.isMac() && keymapService.getAccelerator('hideApp'),
					click: () => { bridge().electronApp().hide(); },
				} : noItem,

				shim.isMac() ? {
					role: 'hideothers',
				} : noItem,

				shim.isMac() ? {
					role: 'unhide',
				} : noItem,

				{
					type: 'separator',
				},
				quitMenuItem],
			};

			const rootMenuFileMacOs = {
				label: _('&File'),
				visible: !!shim.isMac(),
				submenu: [
					newNoteItem,
					newTodoItem,
					newFolderItem,
					newSubFolderItem,
					{
						label: _('Close Window'),
						platforms: ['darwin'],
						accelerator: shim.isMac() && keymapService.getAccelerator('closeWindow'),
						selector: 'performClose:',
					}, {
						type: 'separator',
					}, {
						label: _('Import'),
						submenu: importItems,
					}, {
						label: _('Export all'),
						submenu: exportItems,
					}, {
						type: 'separator',
					},
					printItem,
					switchProfileItem,
				],
			};

			const layoutButtonSequenceOptions = Setting.enumOptions('layoutButtonSequence');
			const layoutButtonSequenceMenuItems = [];

			for (const value in layoutButtonSequenceOptions) {
				layoutButtonSequenceMenuItems.push({
					id: `layoutButtonSequence_${value}`,
					label: layoutButtonSequenceOptions[value],
					type: 'checkbox',
					click: () => {
						Setting.setValue('layoutButtonSequence', value);
					},
				});
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const rootMenus: any = {
				edit: {
					id: 'edit',
					label: _('&Edit'),
					submenu: [
						menuItemDic.textCopy,
						menuItemDic.textCut,
						menuItemDic.textPaste,
						menuItemDic.pasteAsText,
						menuItemDic.textSelectAll,
						separator(),
						// Using the generic "undo"/"redo" roles mean the menu
						// item will work in every text fields, whether it's the
						// editor or a regular text field.
						{
							role: 'undo',
							label: _('Undo'),
						},
						{
							role: 'redo',
							label: _('Redo'),
						},
						separator(),
						menuItemDic.textBold,
						menuItemDic.textItalic,
						menuItemDic.textLink,
						menuItemDic.textCode,
						separator(),
						menuItemDic.insertDateTime,
						menuItemDic.attachFile,
						separator(),
						menuItemDic['editor.deleteLine'],
						menuItemDic['editor.duplicateLine'],
						menuItemDic['editor.toggleComment'],
						menuItemDic['editor.sortSelectedLines'],
						menuItemDic['editor.indentLess'],
						menuItemDic['editor.indentMore'],
						menuItemDic['editor.swapLineDown'],
						menuItemDic['editor.swapLineUp'],
						separator(),
						menuItemDic.focusSearch,
						menuItemDic.showLocalSearch,
					],
				},
				view: {
					label: _('&View'),
					submenu: [
						menuItemDic.toggleLayoutMoveMode,
						menuItemDic.resetLayout,
						separator(),
						menuItemDic.toggleSideBar,
						shim.isMac() ? noItem : menuItemDic.toggleMenuBar,
						menuItemDic.toggleNoteList,
						menuItemDic.toggleVisiblePanes,
						{
							label: _('Layout button sequence'),
							submenu: layoutButtonSequenceMenuItems,
						},
						{
							label: _('Note list style'),
							submenu: noteListMenuItems,
							visible: noteListMenuItems.length > 1,
						},
						separator(),
						{
							label: Setting.settingMetadata('notes.sortOrder.field').label(),
							submenu: sortNoteItems,
						}, {
							label: Setting.settingMetadata('folders.sortOrder.field').label(),
							submenu: sortFolderItems,
						}, {
							id: 'showNoteCounts',
							label: Setting.settingMetadata('showNoteCounts').label(),
							type: 'checkbox',
							click: () => {
								Setting.setValue('showNoteCounts', !Setting.value('showNoteCounts'));
							},
						}, {
							id: 'uncompletedTodosOnTop',
							label: Setting.settingMetadata('uncompletedTodosOnTop').label(),
							type: 'checkbox',
							click: () => {
								Setting.setValue('uncompletedTodosOnTop', !Setting.value('uncompletedTodosOnTop'));
							},
						}, {
							id: 'showCompletedTodos',
							label: Setting.settingMetadata('showCompletedTodos').label(),
							type: 'checkbox',
							click: () => {
								Setting.setValue('showCompletedTodos', !Setting.value('showCompletedTodos'));
							},
						},
						separator(),
						{
							label: _('Actual Size'),
							click: () => {
								Setting.setValue('windowContentZoomFactor', 100);
							},
							accelerator: 'CommandOrControl+0',
						}, {
						// There are 2 shortcuts for the action 'zoom in', mainly to increase the user experience.
						// Most applications handle this the same way. These applications indicate Ctrl +, but actually mean Ctrl =.
						// In fact they allow both: + and =. On the English keyboard layout - and = are used without the shift key.
						// So to use Ctrl + would mean to use the shift key, but this is not the case in any of the apps that show Ctrl +.
						// Additionally it allows the use of the plus key on the numpad.
							label: _('Zoom In'),
							click: () => {
								Setting.incValue('windowContentZoomFactor', 10);
							},
							accelerator: 'CommandOrControl+Plus',
						}, {
							label: _('Zoom In'),
							visible: false,
							click: () => {
								Setting.incValue('windowContentZoomFactor', 10);
							},
							accelerator: 'CommandOrControl+=',
						}, {
							label: _('Zoom Out'),
							click: () => {
								Setting.incValue('windowContentZoomFactor', -10);
							},
							accelerator: 'CommandOrControl+-',
						}],
				},
				go: {
					label: _('&Go'),
					submenu: [
						menuItemDic.historyBackward,
						menuItemDic.historyForward,
						separator(),
						{
							label: _('Focus'),
							submenu: focusItems,
						},
					],
				},
				folder: {
					label: _('Note&book'),
					submenu: [
						menuItemDic.showShareFolderDialog,
					],
				},
				note: {
					label: _('&Note'),
					submenu: [
						menuItemDic.toggleExternalEditing,
						menuItemDic.setTags,
						menuItemDic.showShareNoteDialog,
						separator(),
						menuItemDic.showNoteProperties,
						menuItemDic.showNoteContentProperties,
						separator(),
						menuItemDic.permanentlyDeleteNote,
					],
				},
				tools: {
					label: _('&Tools'),
					submenu: toolsItems,
				},
				window: {
					id: 'window',

					// Adds the default MacOS actions (e.g. "tile left") to the menu.
					//
					// Note: If the dev tools are shown on startup, this adds additional tab-related
					// actions to the menu that are not otherwise shown. See https://stackoverflow.com/a/77458809
					role: 'windowMenu',

					label: _('&Window'),
					visible: !!shim.isMac(),
					submenu: [
						{
							role: 'minimize',
							accelerator: shim.isMac() && keymapService.getAccelerator('minimizeWindow'),
						},
					],
				},
				help: {
					label: _('&Help'),
					role: 'help', // Makes it add the "Search" field on macOS
					submenu: [{
						label: _('Website and documentation'),
						accelerator: keymapService.getAccelerator('help'),
						click() { void bridge().openExternal('https://joplinapp.org'); },
					}, {
						label: _('Joplin Forum'),
						click() { void bridge().openExternal('https://discourse.joplinapp.org'); },
					}, {
						label: _('Join us on Twitter'),
						click() { void bridge().openExternal('https://twitter.com/joplinapp'); },
					}, {
						label: _('Make a donation'),
						click() { void bridge().openExternal('https://joplinapp.org/donate/'); },
					}, {
						label: _('Check for updates...'),
						visible: !shim.isMac(),
						click: () => _checkForUpdates(),
					},
					separator(),
					syncStatusItem,
					separator(),
					{
						id: 'help:toggleDevTools',
						label: _('Toggle development tools'),
						click: () => {
							props.dispatch({
								type: 'NOTE_DEVTOOLS_TOGGLE',
							});
						},
					},

					menuItemDic.toggleSafeMode,
					menuItemDic.openProfileDirectory,
					menuItemDic.copyDevCommand,

					{
						type: 'separator',
						visible: !shim.isMac(),
					}, {
						label: _('About Joplin'),
						visible: !shim.isMac(),
						click: () => _showAbout(),
					}],
				},
			};

			if (shim.isMac()) {
				rootMenus.macOsApp = rootMenuFile;
				rootMenus.file = rootMenuFileMacOs;
			} else {
				rootMenus.file = rootMenuFile;
			}

			// It seems the "visible" property of separators is ignored by Electron, making
			// it display separators that we want hidden. So this function iterates through
			// them and remove them completely.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const cleanUpSeparators = (items: any[]) => {
				const output = [];
				for (const item of items) {
					if ('visible' in item && item.type === 'separator' && !item.visible) continue;
					output.push(item);
				}
				return output;
			};

			for (const key in rootMenus) {
				if (!rootMenus.hasOwnProperty(key)) continue;
				if (!rootMenus[key].submenu) continue;
				rootMenus[key].submenu = cleanUpSeparators(rootMenus[key].submenu);
			}

			rootMenus.go.submenu.push(menuItemDic.gotoAnything);
			rootMenus.tools.submenu.push(menuItemDic.commandPalette);
			rootMenus.tools.submenu.push(menuItemDic.openMasterPasswordDialog);

			for (const view of props.pluginMenuItems) {
				const location: MenuItemLocation = view.location;
				if (isContextMenuItemLocation(location)) continue;

				const itemParent = rootMenus[location];

				if (!itemParent) {
					reg.logger().error('Menu item location does not exist: ', location, view);
				} else {
					itemParent.submenu.push(menuItemDic[view.commandName]);
				}
			}

			for (const view of props.pluginMenus) {
				if (isContextMenuItemLocation(view.location)) continue;
				const itemParent = rootMenus[view.location];

				if (!itemParent) {
					reg.logger().error('Menu location does not exist: ', location, view);
				} else {
					itemParent.submenu.push(createPluginMenuTree(view.label, view.menuItems, (commandName: string) => onMenuItemClickRef.current(commandName)));
				}
			}

			const template = [
				shim.isMac() ? rootMenus.macOsApp : null,
				rootMenus.file,
				rootMenus.edit,
				rootMenus.view,
				rootMenus.go,
				rootMenus.folder,
				rootMenus.note,
				rootMenus.tools,
				shim.isMac() ? rootMenus.window : null,
				rootMenus.help,
			].filter(item => item !== null);

			if (props.routeName !== 'Main') {
				setMenu(Menu.buildFromTemplate([
					{
						label: _('&File'),
						submenu: [quitMenuItem],
					},
					{
						label: _('&Edit'),
						submenu: [
							menuItemDic.textCopy,
							menuItemDic.textCut,
							menuItemDic.textPaste,
							menuItemDic.textSelectAll,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						] as any,
					},
				]));
			} else {
				setMenu(Menu.buildFromTemplate(template));
			}
		}

		timeoutId = setTimeout(updateMenu, 50);

		return () => {
			clearTimeout(timeoutId);
			timeoutId = null;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [
		props.routeName,
		props.pluginMenuItems,
		props.pluginMenus,
		keymapLastChangeTime,
		modulesLastChangeTime,
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['spellChecker.languages'],
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
		props['spellChecker.enabled'],
		noteListMenuItems,
		props.pluginSettings,
		props.customCss,
		props.locale,
		props.profileConfig,
		switchProfileMenuItems,
		menuItemDic,
	]);

	useMenuStates(menu, props);

	useEffect(() => {
		function onKeymapChange() {
			setKeymapLastChangeTime(Date.now());
		}

		KeymapService.instance().on(EventName.KeymapChange, onKeymapChange);

		return () => {
			KeymapService.instance().off(EventName.KeymapChange, onKeymapChange);
		};
	}, []);

	useEffect(() => {
		function onModulesChanged() {
			setModulesLastChangeTime(Date.now());
		}

		InteropService.instance().on('modulesChanged', onModulesChanged);

		return () => {
			InteropService.instance().off('modulesChanged', onModulesChanged);
		};
	}, []);

	return menu;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function MenuBar(props: Props): any {
	const menu = useMenu(props);
	if (menu) Menu.setApplicationMenu(menu);
	applyMenuBarVisibility(props.showMenuBar);
	return null;
}

const mapStateToProps = (state: AppState) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	return {
		menuItemProps: menuUtils.commandsToMenuItemProps(commandNames.concat(getPluginCommandNames(state.pluginService.plugins)), whenClauseContext),
		locale: state.settings.locale,
		routeName: state.route.routeName,
		selectedFolderId: state.selectedFolderId,
		layoutButtonSequence: state.settings.layoutButtonSequence,
		['notes.sortOrder.field']: state.settings['notes.sortOrder.field'],
		['folders.sortOrder.field']: state.settings['folders.sortOrder.field'],
		['notes.sortOrder.reverse']: state.settings['notes.sortOrder.reverse'],
		['folders.sortOrder.reverse']: state.settings['folders.sortOrder.reverse'],
		pluginSettings: state.settings['plugins.states'],
		showNoteCounts: state.settings.showNoteCounts,
		uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
		showCompletedTodos: state.settings.showCompletedTodos,
		pluginMenuItems: stateUtils.selectArrayShallow({ array: pluginUtils.viewsByType(state.pluginService.plugins, 'menuItem') }, 'menuBar.pluginMenuItems'),
		pluginMenus: stateUtils.selectArrayShallow({ array: pluginUtils.viewsByType(state.pluginService.plugins, 'menu') }, 'menuBar.pluginMenus'),
		['spellChecker.languages']: state.settings['spellChecker.languages'],
		['spellChecker.enabled']: state.settings['spellChecker.enabled'],
		plugins: state.pluginService.plugins,
		customCss: state.customCss,
		profileConfig: state.profileConfig,
		noteListRendererIds: state.noteListRendererIds,
		noteListRendererId: state.settings['notes.listRendererId'],
		showMenuBar: state.settings.showMenuBar,
	};
};

export default connect(mapStateToProps)(MenuBar);
