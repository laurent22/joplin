const React = require('react');

import { Component } from 'react';

import { connect } from 'react-redux';
import { FlatList, Text, StyleSheet, Button, View } from 'react-native';
import { FolderEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../utils/types';

const { _ } = require('@joplin/lib/locale');
const { NoteItem } = require('./note-item.js');
const { themeStyle } = require('./global-style.js');

interface NoteListProps {
	themeId: string;
	dispatch: (action: any)=> void;
	notesSource: string;
	items: any[];
	folders: FolderEntity[];
	noteSelectionEnabled?: boolean;
	selectedFolderId?: string;
}

class NoteListComponent extends Component<NoteListProps> {
	private rootRef_: FlatList;
	private styles_: Record<string, StyleSheet.NamedStyles<any>>;

	public constructor(props: NoteListProps) {
		super(props);

		this.state = {
			items: [],
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

		const styles = {
			noItemMessage: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
				fontSize: theme.fontSize,
				color: theme.color,
				textAlign: 'center',
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
	}

	public render() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.props.items.length) {
			return <FlatList
				ref={ref => (this.rootRef_ = ref)}
				data={this.props.items}
				renderItem={({ item }) => <NoteItem note={item} />}
				keyExtractor={item => item.id}
			/>;
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
}

const NoteList = connect((state: AppState) => {
	return {
		items: state.notes,
		folders: state.folders,
		notesSource: state.notesSource,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(NoteListComponent);

export default NoteList;
