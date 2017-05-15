import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'src/log.js';
import { _ } from 'src/locale.js';

class ItemListComponent extends Component {

	constructor() {
		super();
		this.previousListMode = 'view';
		const ds = new ListView.DataSource({
			rowHasChanged: (r1, r2) => { return r1 !== r2; }
		});
		this.state = {
			dataSource: ds,
			items: [],
			selectedItemIds: [],
		};
	}

	componentWillReceiveProps(newProps) {
		// When the items have changed, we just pass this to the data source. However, 
		// when the list mode change, we need to clone the items to make sure the whole
		// list is updated (so that the checkbox can be added or removed).

		let items = newProps.items;

		if (newProps.listMode != this.previousListMode) {
			items = newProps.items.slice();
			for (let i = 0; i < items.length; i++) {
				items[i] = Object.assign({}, items[i]);
			}
			this.previousListMode = newProps.listMode;
		}

		// https://stackoverflow.com/questions/38186114/react-native-redux-and-listview
		this.setState({
			dataSource: this.state.dataSource.cloneWithRows(items),
		});
	}

	setListMode = (mode) => {
		this.props.dispatch({
			type: 'SET_LIST_MODE',
			listMode: mode,
		});
	}

	listView_itemPress = (itemId) => {}

	listView_itemLongPress = (itemId) => {
		this.setListMode('edit');
	}

	render() {
		let renderRow = (item) => {
			let onPress = () => {
				this.listView_itemPress(item.id);
			}
			let onLongPress = () => {
				this.listView_itemLongPress(item.id);
			}
			let editable = this.props.listMode == 'edit' ? ' [X] ' : '';
			return (
				<TouchableHighlight onPress={onPress} onLongPress={onLongPress}>
					<Text>{item.title}<Text>{editable}</Text></Text>
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