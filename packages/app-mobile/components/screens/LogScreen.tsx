import * as React from 'react';

import { FlatList, View, Text, Button, StyleSheet, Platform, Alert } from 'react-native';
import { connect } from 'react-redux';
import { reg } from '@joplin/lib/registry.js';
import { ScreenHeader } from '../ScreenHeader';
import time from '@joplin/lib/time';
const { themeStyle } = require('../global-style.js');
import Logger from '@joplin/lib/Logger';
const { BaseScreenComponent } = require('../base-screen.js');
import { _ } from '@joplin/lib/locale';
import { MenuOptionType } from '../ScreenHeader';
import { AppState } from '../../utils/types';
import Share from 'react-native-share';
import { writeTextToCacheFile } from '../../utils/ShareUtils';
import shim from '@joplin/lib/shim';

const logger = Logger.create('LogScreen');

class LogScreenComponent extends BaseScreenComponent {
	private readonly menuOptions: MenuOptionType[];

	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor() {
		super();

		this.state = {
			logEntries: [],
			showErrorsOnly: false,
		};
		this.styles_ = {};

		this.menuOptions = [
			{
				title: _('Share'),
				onPress: () => {
					void this.onSharePress();
				},
			},
		];
	}

	private async onSharePress() {
		const limit: number|null = null; // no limit
		const levels = this.getLogLevels(this.state.showErrorsOnly);
		const allEntries: any[] = await reg.logger().lastEntries(limit, { levels });
		const logData = allEntries.map(entry => this.formatLogEntry(entry)).join('\n');

		let fileToShare;
		try {
			// Using a .txt file extension causes a "No valid provider found from URL" error
			// and blank share sheet on iOS for larger log files (around 200 KiB).
			fileToShare = await writeTextToCacheFile(logData, 'mobile-log.log');

			await Share.open({
				type: 'text/plain',
				filename: 'log.txt',
				url: `file://${fileToShare}`,
				failOnCancel: false,
			});
		} catch (e) {
			logger.error('Unable to share log data:', e);

			// Display a message to the user (e.g. in the case where the user is out of disk space).
			Alert.alert(_('Error'), _('Unable to share log data. Reason: %s', e.toString()));
		} finally {
			if (fileToShare) {
				await shim.fsDriver().remove(fileToShare);
			}
		}
	}

	public styles() {
		const theme = themeStyle(this.props.themeId);

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: any = {
			row: {
				flexDirection: 'row',
				paddingLeft: 1,
				paddingRight: 1,
				paddingTop: 0,
				paddingBottom: 0,
			},
			rowText: {
				fontSize: 10,
				color: theme.color,
			},
		};

		if (Platform.OS !== 'ios') {
			// Crashes on iOS with error "Unrecognized font family 'monospace'"
			styles.rowText.fontFamily = 'monospace';
		}

		styles.rowTextError = { ...styles.rowText };
		styles.rowTextError.color = theme.colorError;

		styles.rowTextWarn = { ...styles.rowText };
		styles.rowTextWarn.color = theme.colorWarn;

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	public UNSAFE_componentWillMount() {
		void this.resfreshLogEntries();
	}

	private getLogLevels(showErrorsOnly: boolean) {
		let levels = [Logger.LEVEL_DEBUG, Logger.LEVEL_INFO, Logger.LEVEL_WARN, Logger.LEVEL_ERROR];
		if (showErrorsOnly) levels = [Logger.LEVEL_WARN, Logger.LEVEL_ERROR];

		return levels;
	}

	private async resfreshLogEntries(showErrorsOnly: boolean = null) {
		if (showErrorsOnly === null) showErrorsOnly = this.state.showErrorsOnly;

		const levels = this.getLogLevels(showErrorsOnly);

		this.setState({
			logEntries: await reg.logger().lastEntries(1000, { levels: levels }),
			showErrorsOnly: showErrorsOnly,
		});
	}

	private toggleErrorsOnly() {
		void this.resfreshLogEntries(!this.state.showErrorsOnly);
	}

	private formatLogEntry(item: any) {
		return `${time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss')}: ${item.message}`;
	}

	public render() {
		const renderRow = ({ item }: any) => {
			let textStyle = this.styles().rowText;
			if (item.level === Logger.LEVEL_WARN) textStyle = this.styles().rowTextWarn;
			if (item.level === Logger.LEVEL_ERROR) textStyle = this.styles().rowTextError;

			return (
				<View style={this.styles().row}>
					<Text style={textStyle}>{this.formatLogEntry(item)}</Text>
				</View>
			);
		};

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					title={_('Log')}
					menuOptions={this.menuOptions}/>
				<FlatList
					data={this.state.logEntries}
					renderItem={renderRow}
					keyExtractor={item => { return `${item.id}`; }}
				/>
				<View style={{ flexDirection: 'row' }}>
					<View style={{ flex: 1, marginRight: 5 }}>
						<Button
							title={_('Refresh')}
							onPress={() => {
								void this.resfreshLogEntries();
							}}
						/>
					</View>
					<View style={{ flex: 1 }}>
						<Button
							title={this.state.showErrorsOnly ? _('Show all') : _('Errors only')}
							onPress={() => {
								this.toggleErrorsOnly();
							}}
						/>
					</View>
				</View>
			</View>
		);
	}
}

const LogScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(LogScreenComponent as any);

export default LogScreen;
