import React, { Component } from 'react';
import { ListView, View, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { reg } from 'lib/registry.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils'

class LogScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		const ds = new ListView.DataSource({
			rowHasChanged: (r1, r2) => { return r1 !== r2; }
		});
		this.state = {
			dataSource: ds,
		};
	}

	componentWillMount() {
		reg.logger().lastEntries(1000).then((entries) => {
			const newDataSource = this.state.dataSource.cloneWithRows(entries);
			this.setState({ dataSource: newDataSource });
		});
	}

	render() {
		let renderRow = (item) => {
			return (
				<View style={{flexDirection: 'row', paddingLeft: 1, paddingRight: 1, paddingTop:0, paddingBottom:0 }}>
					<Text style={{fontFamily: 'monospace', fontSize: 10}}>{time.unixMsToIsoSec(item.timestamp) + ': ' + item.message}</Text>
				</View>
			);
		}

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<ListView
					dataSource={this.state.dataSource}
					renderRow={renderRow}
					enableEmptySections={true}
				/>
			</View>
		);
	}

}

const LogScreen = connect(
	(state) => {
		return {};
	}
)(LogScreenComponent)

export { LogScreen };