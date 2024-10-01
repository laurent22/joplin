import * as React from 'react';
import { AppState as RNAppState, View, StyleSheet, NativeEventSubscription, ViewStyle, TextStyle } from 'react-native';
import { stateUtils } from '@joplin/lib/reducer';
import { connect } from 'react-redux';
import NoteList from '../NoteList';
import Folder from '@joplin/lib/models/Folder';
import Tag from '@joplin/lib/models/Tag';
import Note, { PreviewsOrder } from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '../global-style';
import { FolderPickerOptions, ScreenHeader } from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import ActionButton from '../buttons/FloatingActionButton';
const { dialogs } = require('../../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;
import BackButtonService from '../../services/BackButtonService';
import { BaseScreenComponent } from '../base-screen';
import { AppState } from '../../utils/types';
import { FolderEntity, NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import { itemIsInTrash } from '@joplin/lib/services/trash';
import AccessibleView from '../accessibility/AccessibleView';
import { Dispatch } from 'redux';

interface Props {
	dispatch: Dispatch;

	themeId: number;
	visible: boolean;

	folders: FolderEntity[];
	tags: TagEntity[];
	notesSource: string;
	notesOrder: PreviewsOrder[];
	uncompletedTodosOnTop: boolean;
	showCompletedTodos: boolean;
	noteSelectionEnabled: boolean;

	activeFolderId: string;
	selectedFolderId: string;
	selectedTagId: string;
	selectedSmartFilterId: string;
	notesParentType: string;
}

interface State {

}

type Styles = Record<string, ViewStyle|TextStyle>;

class NotesScreenComponent extends BaseScreenComponent<Props, State> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code from before rule was applied
	private dialogbox: any;

	private onAppStateChangeSub_: NativeEventSubscription = null;
	private styles_: Record<number, Styles> = {};
	private folderPickerOptions_: FolderPickerOptions;

	public constructor(props: Props) {
		super(props);
	}

	private onAppStateChange_ = async () => {
		// Force an update to the notes list when app state changes
		const newProps = { ...this.props };
		newProps.notesSource = '';
		await this.refreshNotes(newProps);
	};

	private sortButton_press = async () => {
		const buttons = [];
		const sortNoteOptions = Setting.enumOptions('notes.sortOrder.field');

		const makeCheckboxText = function(selected: boolean, sign: string, label: string) {
			const s = sign === 'tick' ? '✓' : '⬤';
			return (selected ? `${s} ` : '') + label;
		};

		for (const field in sortNoteOptions) {
			if (!sortNoteOptions.hasOwnProperty(field)) continue;
			buttons.push({
				text: makeCheckboxText(Setting.value('notes.sortOrder.field') === field, 'bullet', sortNoteOptions[field]),
				id: { name: 'notes.sortOrder.field', value: field },
			});
		}

		buttons.push({
			text: makeCheckboxText(Setting.value('notes.sortOrder.reverse'), 'tick', `[ ${Setting.settingMetadata('notes.sortOrder.reverse').label()} ]`),
			id: { name: 'notes.sortOrder.reverse', value: !Setting.value('notes.sortOrder.reverse') },
		});

		buttons.push({
			text: makeCheckboxText(Setting.value('uncompletedTodosOnTop'), 'tick', `[ ${Setting.settingMetadata('uncompletedTodosOnTop').label()} ]`),
			id: { name: 'uncompletedTodosOnTop', value: !Setting.value('uncompletedTodosOnTop') },
		});

		buttons.push({
			text: makeCheckboxText(Setting.value('showCompletedTodos'), 'tick', `[ ${Setting.settingMetadata('showCompletedTodos').label()} ]`),
			id: { name: 'showCompletedTodos', value: !Setting.value('showCompletedTodos') },
		});

		const r = await dialogs.pop(this, Setting.settingMetadata('notes.sortOrder.field').label(), buttons);
		if (!r) return;

		Setting.setValue(r.name, r.value);
	};

	private backHandler = () => {
		if (this.dialogbox && this.dialogbox.state && this.dialogbox.state.isVisible) {
			this.dialogbox.close();
			return true;
		}
		return false;
	};

	public styles() {
		if (!this.styles_) this.styles_ = {};
		const themeId = this.props.themeId;
		const cacheKey = themeId;

		if (this.styles_[cacheKey]) return this.styles_[cacheKey];
		this.styles_ = {};

		const styles = {
			noteList: {
				flex: 1,
			},
		};

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	public async componentDidMount() {
		BackButtonService.addHandler(this.backHandler);
		await this.refreshNotes();
		this.onAppStateChangeSub_ = RNAppState.addEventListener('change', this.onAppStateChange_);
	}

	public async componentWillUnmount() {
		if (this.onAppStateChangeSub_) this.onAppStateChangeSub_.remove();
		BackButtonService.removeHandler(this.backHandler);
	}

	public async componentDidUpdate(prevProps: Props) {
		if (prevProps.notesOrder !== this.props.notesOrder || prevProps.selectedFolderId !== this.props.selectedFolderId || prevProps.selectedTagId !== this.props.selectedTagId || prevProps.selectedSmartFilterId !== this.props.selectedSmartFilterId || prevProps.notesParentType !== this.props.notesParentType || prevProps.uncompletedTodosOnTop !== this.props.uncompletedTodosOnTop || prevProps.showCompletedTodos !== this.props.showCompletedTodos) {
			await this.refreshNotes(this.props);
		}
	}

	public async refreshNotes(props: Props|null = null) {
		if (props === null) props = this.props;

		const options = {
			order: props.notesOrder,
			uncompletedTodosOnTop: props.uncompletedTodosOnTop,
			showCompletedTodos: props.showCompletedTodos,
			caseInsensitive: true,
		};

		const parent = this.parentItem(props);
		if (!parent) return;

		const source = JSON.stringify({
			options: options,
			parentId: parent.id,
		});

		if (source === props.notesSource) return;

		let notes: NoteEntity[] = [];
		if (props.notesParentType === 'Folder') {
			notes = await Note.previews(props.selectedFolderId, options);
		} else if (props.notesParentType === 'Tag') {
			notes = await Tag.notes(props.selectedTagId, options);
		} else if (props.notesParentType === 'SmartFilter') {
			notes = await Note.previews(null, options);
		}

		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	public newNoteNavigate = async (folderId: string, isTodo: boolean) => {
		try {
			const newNote = await Note.save({
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
			}, { provisional: true });

			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: newNote.id,
			});
		} catch (error) {
			alert(_('Cannot create a new note: %s', error.message));
		}
	};

	public parentItem(props: Props|null = null) {
		if (!props) props = this.props;

		let output = null;
		if (props.notesParentType === 'Folder') {
			output = Folder.byId(props.folders, props.selectedFolderId);
		} else if (props.notesParentType === 'Tag') {
			output = Tag.byId(props.tags, props.selectedTagId);
		} else if (props.notesParentType === 'SmartFilter') {
			output = { id: this.props.selectedSmartFilterId, title: _('All notes') };
		} else {
			return null;
			// throw new Error('Invalid parent type: ' + props.notesParentType);
		}
		return output;
	}

	public folderPickerOptions() {
		const options = {
			enabled: this.props.noteSelectionEnabled,
			mustSelect: true,
		};

		if (this.folderPickerOptions_ && options.enabled === this.folderPickerOptions_.enabled) return this.folderPickerOptions_;

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	public render() {
		const parent = this.parentItem();
		const theme = themeStyle(this.props.themeId);

		const rootStyle = this.props.visible ? theme.rootStyle : theme.hiddenRootStyle;

		const title = parent ? parent.title : null;
		if (!parent) {
			return (
				<View style={rootStyle}>
					<ScreenHeader title={title} showSideMenuButton={true} showBackButton={false} />
				</View>
			);
		}

		const icon = Folder.unserializeIcon(parent.icon);
		const iconString = icon ? `${icon.emoji} ` : '';

		let buttonFolderId = this.props.selectedFolderId !== Folder.conflictFolderId() ? this.props.selectedFolderId : null;
		if (!buttonFolderId) buttonFolderId = this.props.activeFolderId;

		const addFolderNoteButtons = !!buttonFolderId;

		const makeActionButtonComp = () => {
			if ((this.props.notesParentType === 'Folder' && itemIsInTrash(parent)) || !Folder.atLeastOneRealFolderExists(this.props.folders)) return null;

			if (addFolderNoteButtons && this.props.folders.length > 0) {
				const buttons = [];
				buttons.push({
					label: _('New to-do'),
					onPress: async () => {
						const isTodo = true;
						void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'checkbox-outline',
				});

				buttons.push({
					label: _('New note'),
					onPress: async () => {
						const isTodo = false;
						void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'document',
				});
				return <ActionButton buttons={buttons} dispatch={this.props.dispatch}/>;
			}
			return null;
		};

		const actionButtonComp = this.props.noteSelectionEnabled || !this.props.visible ? null : makeActionButtonComp();

		// Ensure that screen readers can't focus the notes list when it isn't visible.
		const accessibilityHidden = !this.props.visible;

		return (
			<AccessibleView
				style={rootStyle}

				inert={accessibilityHidden}
			>
				<ScreenHeader title={iconString + title} showBackButton={false} sortButton_press={this.sortButton_press} folderPickerOptions={this.folderPickerOptions()} showSearchButton={true} showSideMenuButton={true} />
				<NoteList />
				{actionButtonComp}
				<DialogBox
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</AccessibleView>
		);
	}
}

const NotesScreen = connect((state: AppState) => {
	return {
		folders: state.folders,
		tags: state.tags,
		activeFolderId: state.settings.activeFolderId,
		selectedFolderId: state.selectedFolderId,
		selectedNoteIds: state.selectedNoteIds,
		selectedTagId: state.selectedTagId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		notesParentType: state.notesParentType,
		notes: state.notes,
		notesSource: state.notesSource,
		uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
		showCompletedTodos: state.settings.showCompletedTodos,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		notesOrder: stateUtils.notesOrder(state.settings),
	};
})(NotesScreenComponent);

export default NotesScreen;
