import React, { Component } from 'react';
import { ListView, View, Text, Button, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { reg } from 'lib/registry.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils'
import { themeStyle } from 'lib/components/global-style.js';
import { Logger } from 'lib/logger.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { _ } from 'lib/locale.js';

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
		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			row: {
				flexDirection: 'row',
				paddingLeft: 1,
				paddingRight: 1,
				paddingTop:0,
				paddingBottom:0,
			},
			rowText: {
				fontFamily: 'monospace',
				fontSize: 10,
				color: theme.color,				
			},
		};

		styles.rowTextError = Object.assign({}, styles.rowText);
		styles.rowTextError.color = theme.colorError;

		styles.rowTextWarn = Object.assign({}, styles.rowText);
		styles.rowTextWarn.color = theme.colorWarn;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
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
			let textStyle = this.styles().rowText;
			if (item.level == Logger.LEVEL_WARN) textStyle = this.styles().rowTextWarn;
			if (item.level == Logger.LEVEL_ERROR) textStyle = this.styles().rowTextError;
			
			return (
				<View style={this.styles().row}>
					<Text style={textStyle}>{time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss') + ': ' + item.message}</Text>
				</View>
			);
		}

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39
		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Log')}/>
				<ListView
					dataSource={this.state.dataSource}
					renderRow={renderRow}
					enableEmptySections={true}
				/>
				<Button title={_("Refresh")} onPress={() => { this.resfreshLogEntries(); }}/>
			</View>
		);
	}

}

const LogScreen = connect(
	(state) => {
		return {
			theme: state.settings.theme,
		};
	}
)(LogScreenComponent)

export { LogScreen };