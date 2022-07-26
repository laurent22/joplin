import * as React from 'react';
const { View, Text, StyleSheet, TextInput, TouchableOpacity } = require('react-native');
import { State } from '@joplin/lib/reducer';
import { themeStyle } from './global-style';
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('@joplin/lib/locale');
import Checkbox from './checkbox';
import Note from '@joplin/lib/models/Note';

interface Props {
    themeId: string;
	notes: any[];
}

interface NoteListProps {
	note: any;
}

function NotesBarComponent(props: Props) {

	function styles() {
		const themeId = props.themeId;
		const theme = themeStyle(themeId);

		let styles = {
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
			},
			top: {
				color: theme.color,
			},
			topContainer: {
				width: '100%',
				justifyContent: 'space-between',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
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
			},
			searchIcon: {
				fontSize: 22,
			},
			searchInput: {
				alignItems: 'center',
				backgroundColor: theme.backgroundColor,
				paddingLeft: 8,
				paddingRight: 8,
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
			itemText: {
				fontSize: theme.fontSize,
				color: theme.color,
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

	function renderIconButton(icon: JSX.Element) {
		return (
			<TouchableOpacity style={styles().button} activeOpacity={0.8}>{icon}</TouchableOpacity>
		);
	}

	const addNoteButtonComp = renderIconButton(<Icon name='document-text-outline' style={styles().buttonIcon} />);
	const addTodoButtonComp = renderIconButton(<Icon name='checkbox-outline' style={styles().buttonIcon} />);

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


	const NoteListItem = function(props: NoteListProps) {
		// const [ isChecked, setIsChecked ] = React.useState(false);
		const note = props.note ? props.note : {};
		const isTodo = !!Number(note.is_todo);

		let item;

		if (isTodo) {
			item = (
				<View>
					<TouchableOpacity style={styles().padding}>
						<Checkbox style={this.styles().checkbox} checked={!!Number(note.todo_completed)} onChange={this.todoCheckbox_change} />
						<Text style={styles().itemText}>{Note.displayTitle(note)}</Text>
					</TouchableOpacity>
					{dividerComp}
				</View>
			);
		} else {
			item = (
				<View>
					<TouchableOpacity style={styles().padding}>
						<Text style={styles().itemText}>{Note.displayTitle(note)}</Text>
					</TouchableOpacity>
					{dividerComp}
				</View>
			);
		}

		return item;
	};

	return (
		<View style={styles().container}>
			{topComp}
			{inputGroupComp}
			<NoteListItem note={props.notes[0]} />
		</View>
	);
}

const NotesBar = connect((state: State) => {
	return {
		themeId: state.settings.theme,
		notes: state.notes,
	};
})(NotesBarComponent);

export default NotesBar;


