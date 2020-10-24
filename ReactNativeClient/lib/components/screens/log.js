const React = require('react');

const { FlatList, View, Text, Button, StyleSheet, Platform } = require('react-native');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { time } = require('lib/time-utils');
const { themeStyle } = require('lib/components/global-style.js');
const { Logger } = require('lib/logger.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { _ } = require('lib/locale.js');

class LogScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();

		this.state = {
			logEntries: [],
			showErrorsOnly: false,
		};
		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		const styles = {
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

		styles.rowTextError = Object.assign({}, styles.rowText);
		styles.rowTextError.color = theme.colorError;

		styles.rowTextWarn = Object.assign({}, styles.rowText);
		styles.rowTextWarn.color = theme.colorWarn;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	UNSAFE_componentWillMount() {
		this.resfreshLogEntries();
	}

	async resfreshLogEntries(showErrorsOnly = null) {
		if (showErrorsOnly === null) showErrorsOnly = this.state.showErrorsOnly;

		let levels = [Logger.LEVEL_DEBUG, Logger.LEVEL_INFO, Logger.LEVEL_WARN, Logger.LEVEL_ERROR];
		if (showErrorsOnly) levels = [Logger.LEVEL_WARN, Logger.LEVEL_ERROR];

		this.setState({
			logEntries: await reg.logger().lastEntries(1000, { levels: levels }),
			showErrorsOnly: showErrorsOnly,
		});
	}

	toggleErrorsOnly() {
		this.resfreshLogEntries(!this.state.showErrorsOnly);
	}

	render() {
		const renderRow = ({ item }) => {
			let textStyle = this.styles().rowText;
			if (item.level == Logger.LEVEL_WARN) textStyle = this.styles().rowTextWarn;
			if (item.level == Logger.LEVEL_ERROR) textStyle = this.styles().rowTextError;

			return (
				<View style={this.styles().row}>
					<Text style={textStyle}>{`${time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss')}: ${item.message}`}</Text>
				</View>
			);
		};

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Log')} />
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
								this.resfreshLogEntries();
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

const LogScreen = connect(state => {
	return {
		theme: state.settings.theme,
	};
})(LogScreenComponent);

module.exports = { LogScreen };
