import * as React from 'react';

import { View, Text, Button, FlatList, TextStyle } from 'react-native';
import Setting from '@joplin/lib/models/Setting';
import { connect } from 'react-redux';
import { ScreenHeader } from '../ScreenHeader';
import ReportService, { ReportSection } from '@joplin/lib/services/ReportService';
import { _ } from '@joplin/lib/locale';
import { BaseScreenComponent } from '../base-screen';
import { themeStyle } from '../global-style';
import { AppState } from '../../utils/types';

interface Props {
	themeId: number;
}

interface State {
	report: ReportSection[];
}

class StatusScreenComponent extends BaseScreenComponent<Props, State> {
	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor(props: Props) {
		super(props);
		this.state = {
			report: [],
		};
	}

	public override componentDidMount() {
		void this.refreshScreen();
	}

	private async refreshScreen() {
		const service = new ReportService();
		const report = await service.status(Setting.value('sync.target'));
		this.setState({ report: report });
	}

	private styles() {
		const theme = themeStyle(this.props.themeId);
		return {
			body: {
				flex: 1,
				margin: theme.margin,
			},
		};
	}

	public override render() {
		const theme = themeStyle(this.props.themeId);

		const renderBody = (report: ReportSection[]) => {
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

				let style: TextStyle = { ...baseStyle };
				style.fontWeight = 'bold';
				if (i > 0) style.paddingTop = 20;
				lines.push({ key: `section_${i}`, isSection: true, text: section.title });
				if (section.canRetryAll) {
					lines.push({ key: `retry_all_${i}`, text: '', retryAllHandler: section.retryAllHandler });
				}

				for (const n in section.body) {
					if (!section.body.hasOwnProperty(n)) continue;
					style = { ...baseStyle };
					const item = section.body[n];

					let text = '';

					let retryHandler = null;
					if (typeof item === 'object') {
						if (item.canRetry) {
							retryHandler = async () => {
								await item.retryHandler();
								await this.refreshScreen();
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
						const style: TextStyle = { ...baseStyle };

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
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Status')} />
				<View style={this.styles().body}>{body}</View>
				<Button title={_('Refresh')} onPress={() => this.refreshScreen()} />
			</View>
		);
	}
}

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(StatusScreenComponent);
