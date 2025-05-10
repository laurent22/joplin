import * as React from 'react';

import { View, Text, Button, FlatList, TextStyle, StyleSheet, Role } from 'react-native';
import Setting from '@joplin/lib/models/Setting';
import { connect } from 'react-redux';
import { ScreenHeader } from '../ScreenHeader';
import ReportService, { ReportItemType, ReportSection } from '@joplin/lib/services/ReportService';
import { _ } from '@joplin/lib/locale';
import { BaseScreenComponent } from '../base-screen';
import { themeStyle } from '../global-style';
import { AppState } from '../../utils/types';
import checkDisabledSyncItemsNotification from '@joplin/lib/services/synchronizer/utils/checkDisabledSyncItemsNotification';
import { Dispatch } from 'redux';
import Icon from '../Icon';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

interface State {
	report: ReportSection[];
}

interface ProcessedLine {
	key: string;
	text?: string;
	isSection?: boolean;
	isDivider?: boolean;
	retryAllHandler?: ()=> void;
	retryHandler?: ()=> void;
	ignoreHandler?: ()=> void;
	listItems?: ProcessedLine[];
}

type OnRefreshScreen = ()=> Promise<void>;

const processReport = (report: ReportSection[], refreshScreen: OnRefreshScreen, dispatch: Dispatch, baseStyle: TextStyle) => {
	const lines: ProcessedLine[] = [];
	let currentList: ProcessedLine[]|null = null;

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
			let ignoreHandler = null;
			if (typeof item === 'object') {
				if (item.canRetry) {
					retryHandler = async () => {
						await item.retryHandler();
						await refreshScreen();
					};
				}
				if (item.canIgnore) {
					ignoreHandler = async () => {
						await item.ignoreHandler();
						await refreshScreen();
						await checkDisabledSyncItemsNotification((action) => dispatch(action));
					};
				}
				if (item.type === ReportItemType.OpenList) {
					currentList = [];
				} else if (item.type === ReportItemType.CloseList) {
					lines.push({ key: `list_${i}_${n}`, listItems: currentList });
					currentList = null;
				}
				text = item.text;
			} else {
				text = item;
			}

			const line = { key: `item_${i}_${n}`, text: text, retryHandler, ignoreHandler };
			if (currentList) {
				// The OpenList item, for example, might be empty and should be skipped:
				const hasContent = line.text || retryHandler || ignoreHandler;
				if (hasContent) {
					currentList.push(line);
				}
			} else {
				lines.push(line);
			}
		}

		lines.push({ key: `divider2_${i}`, isDivider: true });
	}

	return lines;
};

class StatusScreenComponent extends BaseScreenComponent<Props, State> {
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
		return StyleSheet.create({
			body: {
				flex: 1,
				margin: theme.margin,
			},
			actionButton: {
				flex: 0,
				flexBasis: 'auto',
				marginLeft: 2,
				marginRight: 2,
			},
			retryAllButton: {
				flexGrow: 0,
				alignSelf: 'flex-start',
			},
			baseStyle: {
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 2,
				paddingBottom: 2,
				flex: 0,
				color: theme.color,
				fontSize: theme.fontSize,
				alignSelf: 'center',
			},
			listWrapper: {
				paddingBottom: 5,
			},
			listBullet: {
				fontSize: theme.fontSize / 3,
				color: theme.color,
				alignSelf: 'center',
				justifyContent: 'center',
				flexGrow: 0,
				marginStart: 12,
				marginEnd: 2,
			},
			divider: {
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				marginTop: 20,
				marginBottom: 20,
			},
		});
	}

	public override render() {
		const styles = this.styles();

		const renderItem = (item: ProcessedLine, inList: boolean) => {
			const style: TextStyle = { ...styles.baseStyle };

			let textRole: Role|null = undefined;
			const text = item.text;
			if (item.isSection === true) {
				style.fontWeight = 'bold';
				style.marginBottom = 5;
				textRole = 'heading';
			} else if (inList) {
				textRole = 'listitem';
			}

			style.flex = 1;

			const retryAllButton = item.retryAllHandler ? (
				<View style={styles.retryAllButton}>
					<Button title={_('Retry All')} onPress={item.retryAllHandler} />
				</View>
			) : null;

			const retryButton = item.retryHandler ? (
				<View style={styles.actionButton}>
					<Button title={_('Retry')} onPress={item.retryHandler} />
				</View>
			) : null;

			const ignoreButton = item.ignoreHandler ? (
				<View style={styles.actionButton}>
					<Button title={_('Ignore')} onPress={item.ignoreHandler} />
				</View>
			) : null;

			const textComponent = text ? <Text style={style} role={textRole}>{text}</Text> : null;
			if (item.isDivider) {
				return <View style={styles.divider} role='separator' key={item.key} />;
			} else if (item.listItems) {
				return <View role='list' style={styles.listWrapper} key={item.key}>
					{textComponent}
					{item.listItems.map(item => renderItem(item, true))}
				</View>;
			} else {
				return (
					<View style={{ flex: 1, flexDirection: 'row' }} key={item.key}>
						{inList ? <Icon style={styles.listBullet} name='fas fa-circle' accessibilityLabel={null} /> : null}
						{textComponent}
						{ignoreButton}
						{retryAllButton}
						{retryButton}
					</View>
				);
			}
		};

		const renderBody = (report: ReportSection[]) => {
			const baseStyle = styles.baseStyle;
			const lines = processReport(report, () => this.refreshScreen(), this.props.dispatch, baseStyle);

			return (
				<FlatList
					data={lines}
					renderItem={({ item }) => {
						return renderItem(item, false);
					}}
				/>
			);
		};

		const body = renderBody(this.state.report);

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Status')} />
				<View style={styles.body}>{body}</View>
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
