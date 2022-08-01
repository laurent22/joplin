import * as React from 'react';
const { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } = require('react-native');
import { State } from '@joplin/lib/reducer';
import { themeStyle } from './global-style';
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('@joplin/lib/locale');
import { Style } from './global-style';
import Note from '@joplin/lib/models/Note';
import NotesBarListItem from './NotesBarListItem';
import Folder from '@joplin/lib/models/Folder';

interface Props {
    themeId: string;
	items: any[];
	todoCheckbox_change: (checked: boolean)=> void;
	selectedFolderId: any;
	activeFolderId: any;
	dispatch: any;
}

function NotesBarComponent(props: Props) {

	function styles() {
		const themeId = props.themeId;
		const theme = themeStyle(themeId);

		let styles: Style = {
			container: {
				width: 250,
				backgroundColor: theme.tableBackgroundColor,
			},
			horizontalFlex: {
				flexDirection: 'row',
			},
			title: {
				alignItems: 'center',
			},
			titleText: {
				fontSize: 16,
			},
			closeIcon: {
				fontSize: 30,
				paddingTop: 8,
				paddingBottom: 8,
				paddingRight: theme.marginRight,
				paddingLeft: theme.marginLeft,
			},
			top: {
				color: theme.color,
			},
			topContainer: {
				width: '100%',
				justifyContent: 'space-between',
				paddingLeft: theme.marginLeft,
			},
			padding: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: 12,
				paddingBottom: 12,
			},
			titleIcon: {
				fontSize: 22,
				marginRight: 4,
			},
			divider: {
				backgroundColor: theme.dividerColor,
				height: 1,
				width: '100%',
			},
			nativeInput: {
				fontSize: theme.fontSize,
				flex: 1,
				paddingRight: 8,
			},
			searchIcon: {
				fontSize: 22,
			},
			searchInput: {
				alignItems: 'center',
				backgroundColor: theme.backgroundColor,
				paddingLeft: 8,
				borderRadius: 4,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				height: 42,
				flex: 1,
			},
			button: {
				height: 42,
				width: 42,
				backgroundColor: theme.color4,
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 4,
				flex: 0.5,
				marginLeft: 8,
			},
			buttonIcon: {
				color: theme.backgroundColor,
				fontSize: 22,
			},
			inputGroup: {
				justifyContent: 'space-between',
			},
		};

		styles = StyleSheet.create(styles);

		return styles;
	}

	const titleComp = (
		<View style={[styles().title, styles().horizontalFlex]}>
			<Icon name='md-document'style={[styles().top, styles().titleIcon]} />
			<Text style={[styles().top, styles().titleText]}>{_('Notes')}</Text>
		</View>
	);

	const dividerComp = (
		<View style={styles().divider}></View>
	);

	const closeButtonComp = (
		<TouchableOpacity>
			<Icon name="close" style={[styles().top, styles().closeIcon]}/>
		</TouchableOpacity>
	);

	function renderIconButton(icon: JSX.Element, onPress: ()=> Promise<void>) {
		return (
			<TouchableOpacity style={styles().button} activeOpacity={0.8} onPress={onPress}>{icon}</TouchableOpacity>
		);
	}


	const handleNewNote = async (isTodo: boolean) => {
		let folderId = props.selectedFolderId != Folder.conflictFolderId() ? props.selectedFolderId : null;
		if (!folderId) folderId = props.activeFolderId;

		props.dispatch({
			type: 'NAV_BACK',
		});

		const newNote = await Note.save({
			parent_id: folderId,
			is_todo: isTodo ? 1 : 0,
		}, { provisional: true });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: newNote.id,
		});
	};

	const addNoteButtonComp = renderIconButton(<Icon name='document-text-outline' style={styles().buttonIcon} />, () => handleNewNote(false));
	const addTodoButtonComp = renderIconButton(<Icon name='checkbox-outline' style={styles().buttonIcon} />, () => handleNewNote(true));

	const topComp = (
		<View>
			<View style={[styles().topContainer, styles().horizontalFlex]}>
				{titleComp}
				{closeButtonComp}
			</View>
			{dividerComp}
		</View>
	);

	const searchInputComp = (
		<View style={[styles().horizontalFlex, styles().searchInput]}>
			<Icon name='search' style={[styles().top, styles().searchIcon]}/>
			<TextInput style={styles().nativeInput} placeholder='Search' />
		</View>
	);

	const inputGroupComp = (
		<View style={{ width: '100%' }}>
			<View style={[styles().padding, styles().horizontalFlex, styles().inputGroup]}>
				{searchInputComp}
				{addNoteButtonComp}
				{addTodoButtonComp}
			</View>
			{dividerComp}
		</View>
	);

	const NotesBarListComp = (
		<FlatList
			data={props.items}
			renderItem={({ item }: { item: any }) => {
				if (item.is_todo) {
					return <NotesBarListItem note={item} todoCheckbox_change={props.todoCheckbox_change} />;
				} else {
					return <NotesBarListItem note={item} />;
				}
			}}
			keyExtractor={(item: any) => item.id}
		/>
	);

	return (
		<View style={styles().container}>
			{topComp}
			{inputGroupComp}
			{ NotesBarListComp }
		</View>
	);
}

const NotesBar = connect((state: State) => {
	return {
		themeId: state.settings.theme,
		items: state.notes,
		activeFolderId: state.settings.activeFolderId,
		selectedFolderId: state.selectedFolderId,
	};
})(NotesBarComponent);

export default NotesBar;


