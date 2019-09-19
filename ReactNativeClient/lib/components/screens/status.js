const React = require('react');

const { StyleSheet, View, Text, Button, FlatList } = require('react-native');
const Setting = require('lib/models/Setting.js');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { ReportService } = require('lib/services/report.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');

const styles = StyleSheet.create({
	body: {
		flex: 1,
		margin: globalStyle.margin,
	},
});

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
		let service = new ReportService();
		let report = await service.status(Setting.value('sync.target'));
		this.setState({ report: report });
	}

	render() {
		const theme = themeStyle(this.props.theme);

		const renderBody = report => {
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
				lines.push({ key: `section_${i}`, isSection: true, text: section.title });

				for (let n in section.body) {
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
						let style = Object.assign({}, baseStyle);

						if (item.isSection === true) {
							style.fontWeight = 'bold';
							style.marginBottom = 5;
						}

						style.flex = 1;

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
									{retryButton}
								</View>
							);
						}
					}}
				/>
			);
		};

		let body = renderBody(this.state.report);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Status')} />
				<View style={styles.body}>{body}</View>
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
