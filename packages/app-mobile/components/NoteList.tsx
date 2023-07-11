const React = require('react');

import { Component, FunctionComponent, useState } from 'react';

import { connect } from 'react-redux';
import { FlatList, Text, StyleSheet, Button, View, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../utils/types';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import Setting from '@joplin/lib/models/Setting';

const { _ } = require('@joplin/lib/locale');
const { NoteItem } = require('./note-item.js');
const { themeStyle } = require('./global-style.js');
const { dialogs } = require('../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;

interface NoteListProps {
	themeId: string;
	dispatch: (action: any)=> void;
	notesSource: string;
	items: NoteEntity[];
	folders: FolderEntity[];
	noteSelectionEnabled?: boolean;
	selectedFolderId?: string;
	onSorted: (sortedId: string, newIndex: number)=> void;
}

interface NoteListState {
	items: NoteEntity[];
	selectedItemIds: string[];
	dragStartTime: number;
}

interface NoteItemWrapperProps {
	note: NoteEntity;
	dialogbox: any;
	drag: ()=> void;
	isActive: boolean;
	style: ViewStyle | TextStyle | ImageStyle;
	noteSelectionEnabled?: boolean;
	dispatch: (payload: any)=> void;
}

const NoteItemWrapper: FunctionComponent<NoteItemWrapperProps> = ({
	note,
	drag,
	isActive,
	style,
	dialogbox,
	noteSelectionEnabled,
	dispatch,
}) => {
	const [didMove, setDidMove] = useState(false);

	if (Setting.value('notes.sortOrder.field') !== 'order') {
		drag = async () => {
			const doIt = await dialogs.confirmRef(dialogbox, `${_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by'))}\n\n${_('Do you want to do this')}`);

			if (doIt) {
				Setting.setValue('notes.sortOrder.field', 'order');
			}
		};
	}

	return (
		<View
			style={style}
			onTouchMove={() => {
				setDidMove(true);
			}}
			onTouchEnd={() => {
				if (!didMove) {
					dispatch({
						type: noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
						id: note.id,
					});
				}
			}}
		>
			<NoteItem
				note={note}
				onLongPress={() => {
					drag();
					setDidMove(false);
				}}
				disabled={isActive}
			/>
		</View>
	);
};

const ConnectedNoteItemWrapper = connect((state: AppState) => {
	return {
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(NoteItemWrapper);

class NoteListComponent extends Component<NoteListProps, NoteListState> {
	private rootRef_: FlatList;
	private styles_: Record<string, StyleSheet.NamedStyles<any>>;

	/** DialogBox isn't a type, so we can't use it here */
	private dialogbox: any;

	public constructor(props: NoteListProps) {
		super(props);

		this.state = {
			items: props.items || [],
			selectedItemIds: [],
			dragStartTime: -1,
		};
		this.rootRef_ = null;
		this.styles_ = {};

		this.createNotebookButton_click = this.createNotebookButton_click.bind(this);
	}

	private styles() {
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

	public renderMainContent() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.props.items.length) {
			return (
				<View style={{ flex: 1 }}>
					<DraggableFlatList
						ref={(ref: any) => (this.rootRef_ = ref)}
						data={this.state.items}
						renderItem={({ item, drag, isActive }) => (
							<ScaleDecorator>
								<ConnectedNoteItemWrapper
									note={item}
									drag={drag}
									isActive={isActive}
									style={this.styles().noteContainer}
									dialogbox={this.dialogbox}
								/>
							</ScaleDecorator>
						)}
						keyExtractor={item => item.id}
						onDragEnd={async ({ data, to, from }) => {
							if (this.props.selectedFolderId) {
								this.setState({ items: data });

								if (this.props.onSorted) {
									let newIndex = to;

									if (to > from) {
										newIndex++;
									}

									this.props.onSorted(data[to].id, newIndex);
								}
							}
						}}
					/>
				</View>
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
	};
})(NoteListComponent);

export default NoteList;
