const React = require('react');

const { View, Text, Button, FlatList } = require('react-native');
const Setting = require('lib/models/Setting.js');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { ReportService } = require('lib/services/report.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { themeStyle } = require('lib/components/global-style.js');

class StatusScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			report: [],
		};
	}

	UNSAFE_componentWillMount() {
		this.resfreshScreen();
	}

	async resfreshScreen() {
		const service = new ReportService();
		const report = await service.status(Setting.value('sync.target'));
		this.setState({ report: report });
	}

	styles() {
		const theme = themeStyle(this.props.theme);
		return {
			body: {
				flex: 1,
				margin: theme.margin,
			},
		};
	}

	render() {
		const theme = themeStyle(this.props.theme);

		const renderBody = report => {
			const baseStyle = {
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 2,
				paddingBottom: 2,
				flex: 0,
				color: theme.color,
				fontSize: theme.fontSize,
			};

			const lines = [];

			for (let i = 0; i < report.length; i++) {
				const section = report[i];

				let style = Object.assign({}, baseStyle);
				style.fontWeight = 'bold';
				if (i > 0) style.paddingTop = 20;
				lines.push({ key: `section_${i}`, isSection: true, text: section.title });
				if (section.canRetryAll) {
					lines.push({ key: `retry_all_${i}`, text: '', retryAllHandler: section.retryAllHandler });
				}

				for (const n in section.body) {
					if (!section.body.hasOwnProperty(n)) continue;
					style = Object.assign({}, baseStyle);
					const item = section.body[n];

					let text = '';

					let retryHandler = null;
					if (typeof item === 'object') {
						if (item.canRetry) {
							retryHandler = async () => {
								await item.retryHandler();
								this.resfreshScreen();
							};
						}
						text = item.text;
					} else {
						text = item;
					}

					lines.push({ key: `item_${i}_${n}`, text: text, retryHandler: retryHandler });
				}

				lines.push({ key: `divider2_${i}`, isDivider: true });
			}

			return (
				<FlatList
					data={lines}
					renderItem={({ item }) => {
						const style = Object.assign({}, baseStyle);

						if (item.isSection === true) {
							style.fontWeight = 'bold';
							style.marginBottom = 5;
						}

						style.flex = 1;

						const retryAllButton = item.retryAllHandler ? (
							<View style={{ flex: 0 }}>
								<Button title={_('Retry All')} onPress={item.retryAllHandler} />
							</View>
						) : null;

						const retryButton = item.retryHandler ? (
							<View style={{ flex: 0 }}>
								<Button title={_('Retry')} onPress={item.retryHandler} />
							</View>
						) : null;

						if (item.isDivider) {
							return <View style={{ borderBottomWidth: 1, borderBottomColor: theme.dividerColor, marginTop: 20, marginBottom: 20 }} />;
						} else {
							return (
								<View style={{ flex: 1, flexDirection: 'row' }}>
									<Text style={style}>{item.text}</Text>
									{retryAllButton}
									{retryButton}
								</View>
							);
						}
					}}
				/>
			);
		};

		const body = renderBody(this.state.report);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Status')} />
				<View style={this.styles().body}>{body}</View>
				<Button title={_('Refresh')} onPress={() => this.resfreshScreen()} />
			</View>
		);
	}
}

const StatusScreen = connect(state => {
	return {
		theme: state.settings.theme,
	};
})(StatusScreenComponent);

module.exports = { StatusScreen };
