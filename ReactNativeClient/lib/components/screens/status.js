import React, { Component } from 'react';
import { ListView, StyleSheet, View, Text, Button, FlatList } from 'react-native';
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
import { globalStyle, themeStyle } from 'lib/components/global-style.js';

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
		const theme = themeStyle(this.props.theme);

		function renderBody(report) {
			let output = [];
			let baseStyle = {
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 2,
				paddingBottom: 2,
				flex: 0,
				color: theme.color,
				fontSize: theme.fontSize,
			};

			let lines = [];

			for (let i = 0; i < report.length; i++) {
				let section = report[i];

				let style = Object.assign({}, baseStyle);
				style.fontWeight = 'bold';
				if (i > 0) style.paddingTop = 20;
				lines.push({ key: 'section_' + i, isSection: true, text: section.title });

				for (let n in section.body) {
					if (!section.body.hasOwnProperty(n)) continue;
					style = Object.assign({}, baseStyle);
					lines.push({ key: 'item_' + i + '_' + n, text: section.body[n] });
				}

				lines.push({ key: 'divider2_' + i, isDivider: true });
			}

			return (<FlatList
				data={lines}
				renderItem={({item}) => {
					let style = Object.assign({}, baseStyle);
					if (item.isSection === true) {
						style.fontWeight = 'bold';
						style.marginBottom = 5;
					}
					if (item.isDivider) {
						return (<View style={{borderBottomWidth: 1, borderBottomColor: 'white', marginTop: 20, marginBottom: 20}}/>);
					} else {
						return (<Text style={style}>{item.text}</Text>);
					}
				}}
			/>);
		}

		let body = renderBody(this.state.report);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
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
		return {
			theme: state.settings.theme,
		};
	}
)(StatusScreenComponent)

export { StatusScreen };