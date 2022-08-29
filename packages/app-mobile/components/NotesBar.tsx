import * as React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { State } from '@joplin/lib/reducer';
import { themeStyle } from './global-style';
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('@joplin/lib/locale');
import { Style } from './global-style';
import Note from '@joplin/lib/models/Note';
import NotesBarListItem from './NotesBarListItem';
import Folder from '@joplin/lib/models/Folder';
import useStyles from './useStyles';

interface Props {
    themeId: number;
	notes: any[];
	todoCheckbox_change: (checked: boolean)=> void;
	selectedFolderId: string;
	activeFolderId: string;
	dispatch: any;
	selectedNoteId: string;
	toggleNotesBar: ()=> void;
}

function NotesBarComponent(props: Props) {

	const [notes, setNotes] = React.useState<any[]>(props.notes);
	const [query, setQuery] = React.useState<string>('');

	const themeId = props.themeId;

	const stylingFunction = (theme: Style): Style => {
		return {
			container: {
				flex: 1,
				width: '100%',
				backgroundColor: theme.backgroundColor3,
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
	};

	const styles = useStyles(stylingFunction, themeId);

	const titleComp = (
		<View style={[styles.title, styles.horizontalFlex]}>
			<Icon name='md-document'style={[styles.top, styles.titleIcon]} />
			<Text style={[styles.top, styles.titleText]}>{_('Notes')}</Text>
		</View>
	);

	const dividerComp = (
		<View style={styles.divider}></View>
	);

	const closeButtonComp = (
		<TouchableOpacity onPress={props.toggleNotesBar}>
			<Icon name="close" style={[styles.top, styles.closeIcon]}/>
		</TouchableOpacity>
	);

	const renderIconButton = (icon: JSX.Element, onPress: ()=> Promise<void>) => {
		return (
			<TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onPress}>{icon}</TouchableOpacity>
		);
	};


	const handleNewNote = async (isTodo: boolean) => {
		let folderId = props.selectedFolderId !== Folder.conflictFolderId() ? props.selectedFolderId : null;
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

	const addNoteButtonComp = renderIconButton(<Icon name='document-text-outline' style={styles.buttonIcon} />, () => handleNewNote(false));
	const addTodoButtonComp = renderIconButton(<Icon name='checkbox-outline' style={styles.buttonIcon} />, () => handleNewNote(true));

	const topComp = (
		<View>
			<View style={[styles.topContainer, styles.horizontalFlex]}>
				{titleComp}
				{closeButtonComp}
			</View>
			{dividerComp}
		</View>
	);

	const handleQuerySubmit = async () => {
		if (!query) {
			setNotes(props.notes);
			return;
		}

		let searchQuery = query.trim();

		if (searchQuery === '') {
			setNotes(props.notes);
			return;
		}

		searchQuery = searchQuery.toLowerCase();

		// Find notes in folder using only note title
		const result = props.notes.filter(note => {
			let noteTitle = Note.displayTitle(note);
			noteTitle = noteTitle.toLowerCase();

			return noteTitle.includes(searchQuery);
		});

		setNotes(result);
	};

	const theme = themeStyle(themeId);

	const searchInputComp = (
		<View style={[styles.horizontalFlex, styles.searchInput]}>
			<Icon name='search' style={[styles.top, styles.searchIcon]}/>
			<TextInput style={[styles.top, styles.nativeInput]} placeholder='Search' onChangeText={setQuery} value={query} onSubmitEditing={handleQuerySubmit} placeholderTextColor={theme.dividerColor} />
		</View>
	);

	const inputGroupComp = (
		<View style={{ width: '100%' }}>
			<View style={[styles.padding, styles.horizontalFlex, styles.inputGroup]}>
				{searchInputComp}
				{addNoteButtonComp}
				{addTodoButtonComp}
			</View>
			{dividerComp}
		</View>
	);

	let flatListRef: any = React.useRef(null);

	const memoizedRenderItem = React.useCallback(({ item }: { item: any }) => {
		if (item.is_todo) {
			return <NotesBarListItem note={item} todoCheckbox_change={props.todoCheckbox_change} />;
		} else {
			return <NotesBarListItem note={item} />;
		}
	}, [props.todoCheckbox_change]);

	const NotesBarListComp = (
		<FlatList
			data={notes}
			renderItem={memoizedRenderItem}
			keyExtractor={(item: any) => item.id}
			getItemLayout={(data, index) => (
				{
					length: data.length,
					offset: (theme.fontSize + styles.padding.paddingTop + styles.padding.paddingBottom) * index,
					viewOffset: (theme.fontSize + styles.padding.paddingTop + styles.padding.paddingBottom),
					index,
				}
			)}
			ref={(ref: any) => { flatListRef = ref; }}
		/>
	);

	// Scroll the notesbar to selected note item after rendering
	React.useEffect(() => {
		const selectedItemIndex = notes.findIndex(item => item.id === props.selectedNoteId);
		if (selectedItemIndex >= 0) {
			flatListRef.scrollToIndex({ index: selectedItemIndex });
		}
	});

	// Update the notesbar when a note item changes
	React.useEffect(() => {
		setNotes(props.notes);
	}, [props.notes]);

	return (
		<View style={styles.container}>
			{topComp}
			{inputGroupComp}
			{ NotesBarListComp }
		</View>
	);
}

const NotesBar = connect((state: State) => {
	return {
		themeId: state.settings.theme,
		notes: state.notes,
		activeFolderId: state.settings.activeFolderId,
		selectedFolderId: state.selectedFolderId,
		selectedNoteId: state.selectedNoteIds[0],
	};
})(NotesBarComponent);

export default NotesBar;
