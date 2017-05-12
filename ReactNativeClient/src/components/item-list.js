import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight } from 'react-native';
import { Log } from 'src/log.js';
import { _ } from 'src/locale.js';

class ItemListComponent extends Component {

	constructor() {
		super();
		const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = { dataSource: ds };
	}

	componentWillMount() {
		const newDataSource = this.state.dataSource.cloneWithRows(this.props.notes);
		this.state = { dataSource: newDataSource };
	}

	componentWillReceiveProps(newProps) {
		// https://stackoverflow.com/questions/38186114/react-native-redux-and-listview
		this.setState({ dataSource: this.state.dataSource.cloneWithRows(newProps.notes) });
	}

	render() {
		let renderRow = (rowData) => {
			let onPress = () => {
				this.props.onItemClick(rowData.id)
			}
			return (
				<TouchableHighlight onPress={onPress}>
					<Text>{rowData.title}</Text>
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

const ItemList = connect(
	(state) => {
		return { notes: state.notes };
	},
	(dispatch) => {
		return {
			onItemClick: (noteId) => {
				dispatch({
					type: 'Navigation/NAVIGATE',
					routeName: 'Note',
					noteId: noteId,
				});
			}
		}
	}
)(ItemListComponent)

export { ItemList };