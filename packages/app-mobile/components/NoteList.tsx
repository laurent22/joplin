const React = require('react');

import { connect } from 'react-redux';
import { Component } from 'react';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../utils/types';
import { FlatList, Text, StyleSheet, Button, View, Animated, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

const { _ } = require('@joplin/lib/locale');
const { NoteItem } = require('./note-item.js');
const { themeStyle } = require('./global-style.js');
const { dialogs } = require('../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;

interface NoteListProps {
	themeId: string;
	dispatch: (action: any)=> void;
	notesSource: string;
	items: any[];
	folders: FolderEntity[];
	noteSelectionEnabled?: boolean;
	selectedFolderId?: string;
}

interface AdditionalNoteItemProps {
	drag?: Function;
	isActive?: boolean;
}

interface NoteListState {
	items: any[];
	selectedItemIds: string[];
}

class NoteListComponent extends Component<NoteListProps> {
	private rootRef_: FlatList;
	private styles_: Record<string, StyleSheet.NamedStyles<any>>;
	public state: NoteListState;

	/** DialogBox isn't a type, so we can't use it here */
	private dialogbox: any;

	public constructor(props: NoteListProps) {
		super(props);

		this.state = {
			items: props.items || [],
			selectedItemIds: [],
		};
		this.rootRef_ = null;
		this.styles_ = {};

		this.createNotebookButton_click = this.createNotebookButton_click.bind(this);
	}

	public styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles: Record<string, ViewStyle | TextStyle | ImageStyle> = {
			noItemMessage: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
				fontSize: theme.fontSize,
				color: theme.color,
				textAlign: 'center',
			},
			selectAction: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				// Reverse the color 4 to use for e.x. white text over blue bg
				backgroundColor: theme.color4,
				justifyContent: 'center',
			},
			actionText: {
				// Reverse the color 4 to use for e.x. white text over blue bg
				color: theme.backgroundColor4,
				fontSize: theme.fontSize,
			},
			noteContainer: {
				backgroundColor: theme.backgroundColor,
			},
			noNotebookView: {
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	private createNotebookButton_click() {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	}

	public UNSAFE_componentWillReceiveProps(newProps: NoteListProps) {
		// Make sure scroll position is reset when switching from one folder to another or to a tag list.
		if (this.rootRef_ && newProps.notesSource !== this.props.notesSource) {
			this.rootRef_.scrollToOffset({ offset: 0, animated: false });
		}

		this.setState({
			items: newProps.items || [],
		});
	}

	public renderNoteItem(note: NoteEntity, additionalProps?: AdditionalNoteItemProps) {
		let currentSwipeable: Swipeable = null;

		const renderLeftActions = (_progress: Animated.AnimatedInterpolation<string | number>, dragX: Animated.AnimatedInterpolation<string | number>) => {
			const trans = dragX.interpolate({
				inputRange: [0, 50, 100, 101],
				outputRange: [-20, 0, 0, 1],
				extrapolate: 'clamp',
			});

			return (
				<RectButton style={this.styles().selectAction} onPress={() => { }}>
					<Animated.Text
						style={[
							this.styles().actionText,
							{
								transform: [{ translateX: trans }],
							},
						]}>
						{_('Select')}
					</Animated.Text>
				</RectButton>
			);
		};

		const onOpen = (side: 'left' | 'right') => {
			if (side === 'left') {
				this.props.dispatch({
					type: this.props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
					id: note.id,
				});

				if (currentSwipeable) {
					currentSwipeable.close();
				}
			}
		};

		let drag = additionalProps && additionalProps.drag;

		if (Setting.value('notes.sortOrder.field') !== 'order') {
			drag = async () => {
				const doIt = await dialogs.confirmRef(this.dialogbox, `${_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by'))}\n\n${_('Do you want to do this')}`);

				if (doIt) {
					Setting.setValue('notes.sortOrder.field', 'order');
				}
			};
		}

		const noteContent = (
			<View style={this.styles().noteContainer}>
				<NoteItem
					note={note}
					onLongPress={drag}
					disabled={additionalProps && additionalProps.isActive}
				/>
			</View>
		);

		if (this.props.noteSelectionEnabled) {
			return noteContent;
		}

		return (
			<Swipeable renderLeftActions={renderLeftActions} onSwipeableOpen={onOpen} ref={(swipeable) => currentSwipeable = swipeable}>
				{noteContent}
			</Swipeable>
		);
	}

	public renderMainContent() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.props.items.length) {
			return (
				<DraggableFlatList
					ref={(ref: any) => (this.rootRef_ = ref)}
					data={this.state.items}
					renderItem={({ item, drag, isActive }) => (<ScaleDecorator>
						{this.renderNoteItem(item, { drag, isActive })}
					</ScaleDecorator>)}
					keyExtractor={item => item.id}
					onDragEnd={async ({ data, to }) => {
						if (this.props.selectedFolderId) {
							this.setState({ items: data });
							await Note.insertNotesAt(
								this.props.selectedFolderId,
								[data[to].id],
								to,
								Setting.value('uncompletedTodosOnTop'),
								Setting.value('showCompletedTodos')
							);
							this.props.dispatch({
								type: 'NOTE_UPDATE_ALL',
								notes: data,
								notesSource: this.props.notesSource,
							});
						}
					}}
				/>
			);
		} else {
			if (!this.props.folders.length) {
				const noItemMessage = _('You currently have no notebooks.');
				return (
					<View style={this.styles().noNotebookView}>
						<Text style={this.styles().noItemMessage}>{noItemMessage}</Text>
						<Button title={_('Create a notebook')} onPress={this.createNotebookButton_click} />
					</View>
				);
			} else {
				const noItemMessage = _('There are currently no notes. Create one by clicking on the (+) button.');
				return <Text style={this.styles().noItemMessage}>{noItemMessage}</Text>;
			}
		}
	}
	public render() {
		return (
			<>
				{this.renderMainContent()}
				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</>
		);
	}
}

const NoteList = connect((state: AppState) => {
	return {
		items: state.notes,
		folders: state.folders,
		selectedFolderId: state.selectedFolderId,
		notesSource: state.notesSource,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(NoteListComponent);

export default NoteList;
