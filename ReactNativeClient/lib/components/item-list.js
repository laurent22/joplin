import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, Switch, View, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { _ } from 'lib/locale.js';
import { Checkbox } from 'lib/components/checkbox.js';
import { reg } from 'lib/registry.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';
import { globalStyle } from 'lib/components/global-style.js';

const styles = StyleSheet.create({
	listItem: {
		flexDirection: 'row',
		height: 40,
		borderBottomWidth: 1,
		borderBottomColor: globalStyle.dividerColor,
		alignItems: 'center',
		paddingLeft: globalStyle.marginLeft,
		backgroundColor: globalStyle.backgroundColor,
	},
});

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

	async todoCheckbox_change(itemId, checked) {	
		let note = await Note.load(itemId);
		await Note.save({ id: note.id, todo_completed: checked ? time.unixMs() : 0 });
		reg.scheduleSync();

	}

	listView_itemLongPress(itemId) {}
	listView_itemPress(itemId) {}

	render() {
		let renderRow = (item) => {
			let onPress = () => {
				this.listView_itemPress(item.id);
			}
			let onLongPress = () => {
				this.listView_itemLongPress(item.id);
			}

			const listItemStyle = { color: globalStyle.color };
			const checkboxStyle = Object.assign({}, listItemStyle);
			if (!Number(item.is_todo)) checkboxStyle.display = 'none';

			const checkboxChecked = !!Number(item.todo_completed);

			return (
				<TouchableHighlight onPress={onPress} onLongPress={onLongPress} underlayColor="#0066FF">
					<View style={ styles.listItem }>
						<Checkbox style={checkboxStyle} checked={checkboxChecked} onChange={(checked) => { this.todoCheckbox_change(item.id, checked) }}/><Text style={listItemStyle}>{item.title}</Text>
					</View>
				</TouchableHighlight>
			);
		}

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.state.dataSource.getRowCount()) {
			return (
				<ListView
					dataSource={this.state.dataSource}
					renderRow={renderRow}
					enableEmptySections={true}
				/>
			);
		} else {
			const noItemMessage = this.props.noItemMessage ? this.props.noItemMessage : '';
			return <Text>{noItemMessage}</Text>;
		}
	}
}

export { ItemListComponent };