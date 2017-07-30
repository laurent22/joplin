import React, { Component } from 'react';
import { ListView, StyleSheet, View, Text, Button } from 'react-native';
import { Setting } from 'lib/models/setting.js';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { reg } from 'lib/registry.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils'
import { Logger } from 'lib/logger.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Database } from 'lib/database.js';
import { Folder } from 'lib/models/folder.js';
import { ReportService } from 'lib/services/report.js';
import { _ } from 'lib/locale.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { globalStyle } from 'lib/components/global-style.js';

const styles = StyleSheet.create({
	body: {
		flex: 1,
		margin: globalStyle.margin,
	},
});

class StatusScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			report: [],
		};
	}

	componentWillMount() {
		this.resfreshScreen();
	}

	async resfreshScreen() {
		let service = new ReportService();
		let report = await service.status(Setting.value('sync.target'));
		this.setState({ report: report });
	}

	render() {
		function renderBody(report) {
			let output = [];
			let baseStyle = {
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 0,
				paddingBottom: 0,
				flex: 0,
				fontSize: globalStyle.fontSize,
			};
			for (let i = 0; i < report.length; i++) {
				let section = report[i];

				let style = Object.assign({}, baseStyle);
				style.fontWeight = 'bold';
				if (i > 0) style.paddingTop = 20;
				output.push(<Text key={'sectiontitle_' + i} style={style}>{section.title}</Text>);

				for (let n in section.body) {
					if (!section.body.hasOwnProperty(n)) continue;
					style = Object.assign({}, baseStyle);
					output.push(<Text key={'line_' + i + '_' + n} style={style}>{section.body[n]}</Text>);
				}
			}

			return output;
		}

		let body = renderBody(this.state.report);

		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Status')}/>
				<View style={styles.body}>
					{ body }
				</View>
				<Button title={_("Refresh")} onPress={() => this.resfreshScreen()}/>
			</View>
		);
	}

}

const StatusScreen = connect(
	(state) => {
		return {};
	}
)(StatusScreenComponent)

export { StatusScreen };