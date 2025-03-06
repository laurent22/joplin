import * as React from 'react';

import { FlatList, View, Text, Button, StyleSheet, Platform } from 'react-native';
import { connect } from 'react-redux';
import { reg } from '@joplin/lib/registry';
import { ScreenHeader } from '../ScreenHeader';
import time from '@joplin/lib/time';
import { themeStyle } from '../global-style';
import Logger from '@joplin/utils/Logger';
import { BaseScreenComponent } from '../base-screen';
import { _ } from '@joplin/lib/locale';
import { MenuOptionType } from '../ScreenHeader';
import { AppState } from '../../utils/types';
import { writeTextToCacheFile } from '../../utils/ShareUtils';
import shim from '@joplin/lib/shim';
import { TextInput } from 'react-native-paper';
import shareFile from '../../utils/shareFile';

const logger = Logger.create('LogScreen');

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	navigation: any;
}

interface State {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	logEntries: any[];
	showErrorsOnly: boolean;
	filter: string|undefined;
}

class LogScreenComponent extends BaseScreenComponent<Props, State> {
	private readonly menuOptions_: MenuOptionType[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor(props: Props) {
		super(props);

		this.state = {
			logEntries: [],
			showErrorsOnly: false,
			filter: undefined,
		};
		this.styles_ = {};

		this.menuOptions_ = [
			{
				title: _('Share'),
				onPress: () => {
					void this.onSharePress();
				},
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private refreshLogTimeout: any = null;
	public override componentDidUpdate(_prevProps: Props, prevState: State) {
		if ((prevState?.filter ?? '') !== (this.state.filter ?? '')) {
			// We refresh the log only after a brief delay -- this prevents the log from updating
			// with every keystroke in the filter input.
			if (this.refreshLogTimeout) {
				clearTimeout(this.refreshLogTimeout);
			}
			setTimeout(() => {
				this.refreshLogTimeout = null;
				void this.refreshLogEntries();
			}, 600);
		}
	}

	public override componentDidMount() {
		void this.refreshLogEntries();

		if (this.props.navigation.state.defaultFilter) {
			this.setState({ filter: this.props.navigation.state.defaultFilter });
		}
	}

	private async getLogEntries(showErrorsOnly: boolean, limit: number|null = null) {
		const levels = this.getLogLevels(showErrorsOnly);
		return await reg.logger().lastEntries(limit, { levels, filter: this.state.filter });
	}

	private async onSharePress() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const allEntries: any[] = await this.getLogEntries(this.state.showErrorsOnly);
		const logData = allEntries.map(entry => this.formatLogEntry(entry)).join('\n');

		let fileToShare;
		try {
			// Using a .txt file extension causes a "No valid provider found from URL" error
			// and blank share sheet on iOS for larger log files (around 200 KiB).
			fileToShare = await writeTextToCacheFile(logData, 'mobile-log.log');
			await shareFile(fileToShare, 'text/plain');
		} catch (e) {
			logger.error('Unable to share log data:', e);

			// Display a message to the user (e.g. in the case where the user is out of disk space).
			void shim.showErrorDialog(_('Unable to share log data. Reason: %s', e.toString()));
		} finally {
			if (fileToShare) {
				await shim.fsDriver().remove(fileToShare);
			}
		}
	}

	public styles() {
		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const theme = themeStyle(this.props.themeId);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	private getLogLevels(showErrorsOnly: boolean) {
		let levels = [Logger.LEVEL_DEBUG, Logger.LEVEL_INFO, Logger.LEVEL_WARN, Logger.LEVEL_ERROR];
		if (showErrorsOnly) levels = [Logger.LEVEL_WARN, Logger.LEVEL_ERROR];

		return levels;
	}

	private async refreshLogEntries(showErrorsOnly: boolean = null) {
		if (showErrorsOnly === null) showErrorsOnly = this.state.showErrorsOnly;

		const limit = 1000;
		const logEntries = await this.getLogEntries(showErrorsOnly, limit);

		this.setState({
			logEntries: logEntries,
			showErrorsOnly: showErrorsOnly,
		});
	}

	private toggleErrorsOnly() {
		void this.refreshLogEntries(!this.state.showErrorsOnly);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private formatLogEntry(item: any) {
		return `${time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss')}: ${item.message}`;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private onRenderLogRow = ({ item }: any) => {
		let textStyle = this.styles().rowText;
		if (item.level === Logger.LEVEL_WARN) textStyle = this.styles().rowTextWarn;
		if (item.level === Logger.LEVEL_ERROR) textStyle = this.styles().rowTextError;

		return (
			<View style={this.styles().row}>
				<Text style={textStyle}>{this.formatLogEntry(item)}</Text>
			</View>
		);
	};

	private onFilterUpdated = (newFilter: string) => {
		this.setState({ filter: newFilter });
	};

	private onToggleFilterInput = () => {
		const filter = this.state.filter === undefined ? '' : undefined;
		this.setState({ filter });
	};

	public render() {
		const filterInput = (
			<TextInput
				value={this.state.filter}
				onChangeText={this.onFilterUpdated}
				label={_('Filter')}
				placeholder={_('Filter')}
			/>
		);

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					title={_('Log')}
					menuOptions={this.menuOptions_}
					showSearchButton={true}
					onSearchButtonPress={this.onToggleFilterInput}/>
				{this.state.filter !== undefined ? filterInput : null}
				<FlatList
					data={this.state.logEntries}
					initialNumToRender={100}
					renderItem={this.onRenderLogRow}
					keyExtractor={item => { return `${item.id}`; }}
				/>
				<View style={{ flexDirection: 'row' }}>
					<View style={{ flex: 1, marginRight: 5 }}>
						<Button
							title={_('Refresh')}
							onPress={() => {
								void this.refreshLogEntries();
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
})(LogScreenComponent);

export default LogScreen;
