import * as React from 'react';
import { useState, useEffect } from 'react';
import ButtonBar from '../ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
const { connect } = require('react-redux');
import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import ReportService, { ReportItem, ReportSection, RetryAllHandler } from '@joplin/lib/services/ReportService';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import styled from 'styled-components';
import { AppState } from '../../app.reducer';
import { writeFileSync } from 'fs';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

const StyledAdvancedToolItem = styled.div`
	margin-bottom: 1em;
`;

async function exportDebugReportClick() {
	const filename = `syncReport-${new Date().getTime()}.csv`;

	const filePath = await bridge().showSaveDialog({
		title: _('Please select where the sync status should be exported to'),
		defaultPath: filename,
	});

	if (!filePath) return;

	const service = new ReportService();
	const csv = (await service.basicItemList({ format: 'csv' })) as string;
	await writeFileSync(filePath, csv);
}

function StatusScreen(props: Props) {
	const [report, setReport] = useState<ReportSection[]>([]);

	async function refreshScreen() {
		const service = new ReportService();
		const r = await service.status(Setting.value('sync.target'));
		setReport(r);
	}

	useEffect(() => {
		void refreshScreen();
	}, []);

	const theme = themeStyle(props.themeId);
	const style = { ...props.style,
		display: 'flex',
		flexDirection: 'column',
	};

	const inlineLinkStyle = { ...theme.urlStyle, marginLeft: 5 };
	const retryAllStyle = { ...theme.urlStyle, marginTop: 5, display: 'inline-block' };

	const containerPadding = theme.configScreenPadding;

	const containerStyle = { ...theme.containerStyle, padding: containerPadding,
		flex: 1 };

	function renderSectionTitle(key: string, title: string) {
		return (
			<h2 key={`section_${key}`} style={theme.h2Style}>
				{title}
			</h2>
		);
	}

	function renderSectionRetryAll(key: string, retryAllHandler: RetryAllHandler) {
		return (
			<a key={`retry_all_${key}`} href="#" onClick={retryAllHandler} style={retryAllStyle}>
				{_('Retry All')}
			</a>
		);
	}

	const renderRetryAll = (key: string, section: ReportSection) => {
		const items: React.JSX.Element[] = [];
		if (section.canRetryAll) {
			items.push(renderSectionRetryAll(`${key}_${section.title}`, async () => {
				await section.retryAllHandler();
				void refreshScreen();
			}));
		}
		return items;
	};

	const renderSection = (key: string, section: ReportSection) => {
		let items = [];

		items.push(renderSectionTitle(section.title, section.title));

		items = items.concat(renderRetryAll('top', section));

		let currentListKey = '';
		let listItems: React.JSX.Element[] = [];
		for (const n in section.body) {
			if (!section.body.hasOwnProperty(n)) continue;
			const item = section.body[n];
			let text = '';

			let ignoreLink = null;
			let retryLink = null;
			let itemType = null;
			if (typeof item === 'object') {
				if (item.canIgnore) {
					const onClick = async () => {
						await item.ignoreHandler();
						void refreshScreen();
					};
					ignoreLink = (
						<a href="#" onClick={onClick} style={inlineLinkStyle}>
							{_('Ignore')}
						</a>
					);
				}
				if (item.canRetry) {
					const onClick = async () => {
						await item.retryHandler();
						void refreshScreen();
					};

					retryLink = (
						<a href="#" onClick={onClick} style={inlineLinkStyle}>
							{_('Retry')}
						</a>
					);
				}
				text = item.text;
				itemType = item.type;
			} else {
				text = item;
			}

			if (itemType === 'openList') {
				currentListKey = (item as ReportItem).key;
				continue;
			}

			if (itemType === 'closeList') {
				items.push(<ul key={currentListKey}>{listItems}</ul>);
				currentListKey = '';
				listItems = [];
				continue;
			}

			if (!text) text = '\xa0';

			const actionLinks = <>{ignoreLink} {retryLink}</>;
			if (currentListKey) {
				listItems.push(
					<li style={theme.textStyle} key={`item_${n}`}>
						<span>{text}</span>
						{actionLinks}
					</li>,
				);
			} else {
				items.push(
					<div style={theme.textStyle} key={`item_${n}`}>
						<span>{text}</span>
						{actionLinks}
					</div>,
				);
			}
		}

		items = items.concat(renderRetryAll('bottom', section));

		return <div key={key}>{items}</div>;
	};

	function renderBody(report: ReportSection[]) {
		const sections = [];

		for (let i = 0; i < report.length; i++) {
			const section = report[i];
			if (!section.body.length) continue;
			sections.push(renderSection(`${i}`, section));
		}

		return <div>{sections}</div>;
	}

	function renderTools() {
		return (
			<div>
				<h2 key="section_tools" style={theme.h2Style}>
					{_('Advanced tools')}
				</h2>
				<StyledAdvancedToolItem>
					<Button level={ButtonLevel.Primary} title={_('Export debug report')} onClick={() => exportDebugReportClick()}/>
				</StyledAdvancedToolItem>
			</div>
		);
	}

	const body = renderBody(report);

	return (
		<div style={style}>
			<div style={containerStyle}>
				{renderTools()}
				{body}
			</div>
			<ButtonBar
				onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })}
			/>
		</div>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(StatusScreen);

