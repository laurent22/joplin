import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, Switch, View } from 'react-native';
import { Log } from 'src/log.js';
import { _ } from 'src/locale.js';
import { Checkbox } from 'src/components/checkbox.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';
import { Note } from 'src/models/note.js';

class ItemListComponent extends Component {

	constructor() {
		super();
		const ds = new ListView.DataSource({
			rowHasChanged: (r1, r2) => { return r1 !== r2; }
		});
		this.state = {
			dataSource: ds,
			items: [],
			selectedItemIds: [],
		};
	}

	componentWillMount() {
		const newDataSource = this.state.dataSource.cloneWithRows(this.props.items);
		this.state = { dataSource: newDataSource };
	}

	componentWillReceiveProps(newProps) {
		// https://stackoverflow.com/questions/38186114/react-native-redux-and-listview
		this.setState({
			dataSource: this.state.dataSource.cloneWithRows(newProps.items),
		});
	}

	todoCheckbox_change(itemId, checked) {
		Note.load(itemId).then((oldNote) => {
			let newNote = Object.assign({}, oldNote);
			newNote.todo_completed = checked;
			return NoteFolderService.save('note', newNote, oldNote);
		});
	}

	listView_itemPress = (itemId) => {}

	render() {
		let renderRow = (item) => {
			let onPress = () => {
				this.listView_itemPress(item.id);
			}
			let onLongPress = () => {
				this.listView_itemLongPress(item.id);
			}

			return (
				<TouchableHighlight onPress={onPress} onLongPress={onLongPress}>
					<View style={{flexDirection: 'row'}}>
						{ !!Number(item.is_todo) && <Checkbox checked={!!Number(item.todo_completed)} onChange={(checked) => { this.todoCheckbox_change(item.id, checked) }}/> }<Text>{item.title} [{item.id}]</Text>
					</View>
				</TouchableHighlight>
			);
		}

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39
		return (
			<ListView
				dataSource={this.state.dataSource}
				renderRow={renderRow}
				enableEmptySections={true}
			/>
		);
	}
}

export { ItemListComponent };