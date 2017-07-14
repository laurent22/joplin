import React, { Component } from 'react';
import { ListView, View, Text, Button } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { reg } from 'lib/registry.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils'
import { Logger } from 'lib/logger.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';

class LogScreenComponent extends BaseScreenComponent {
	
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
		this.resfreshLogEntries();
	}

	resfreshLogEntries() {
		reg.logger().lastEntries(1000).then((entries) => {
			const newDataSource = this.state.dataSource.cloneWithRows(entries);
			this.setState({ dataSource: newDataSource });
		});
	}

	render() {
		let renderRow = (item) => {
			let color = 'black';
			if (item.level == Logger.LEVEL_WARN) color = '#9A5B00';
			if (item.level == Logger.LEVEL_ERROR) color = 'red';

			let style = {
				fontFamily: 'monospace',
				fontSize: 10,
				color: color,
			};
			return (
				<View style={{flexDirection: 'row', paddingLeft: 1, paddingRight: 1, paddingTop:0, paddingBottom:0 }}>
					<Text style={style}>{time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm') + ': ' + item.message}</Text>
				</View>
			);
		}

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39
		return (
			<View style={this.styles().screen}>
				<ScreenHeader navState={this.props.navigation.state} />
				<ListView
					dataSource={this.state.dataSource}
					renderRow={renderRow}
					enableEmptySections={true}
				/>
				<Button title="Refresh" onPress={() => { this.resfreshLogEntries(); }}/>
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