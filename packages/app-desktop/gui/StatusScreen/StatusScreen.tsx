import * as React from 'react';
import { useState, useEffect } from 'react';
import ButtonBar from '../ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
const Setting = require('@joplin/lib/models/Setting').default;
const bridge = require('electron').remote.require('./bridge').default;
const { themeStyle } = require('@joplin/lib/theme');
const { ReportService } = require('@joplin/lib/services/report.js');
const fs = require('fs-extra');

interface Props {
	themeId: string;
	style: any;
	dispatch: Function;
}

async function exportDebugReportClick() {
	const filename = `syncReport-${new Date().getTime()}.csv`;

	const filePath = bridge().showSaveDialog({
		title: _('Please select where the sync status should be exported to'),
		defaultPath: filename,
	});

	if (!filePath) return;

	const service = new ReportService();
	const csv = await service.basicItemList({ format: 'csv' });
	await fs.writeFileSync(filePath, csv);
}

function StatusScreen(props: Props) {
	const [report, setReport] = useState<any[]>([]);

	async function resfreshScreen() {
		const service = new ReportService();
		const r = await service.status(Setting.value('sync.target'));
		setReport(r);
	}

	useEffect(() => {
		void resfreshScreen();
	}, []);

	const theme = themeStyle(props.themeId);
	const style = { ...props.style,
		display: 'flex',
		flexDirection: 'column',
	};

	const retryStyle = Object.assign({}, theme.urlStyle, { marginLeft: 5 });
	const retryAllStyle = Object.assign({}, theme.urlStyle, { marginTop: 5, display: 'inline-block' });

	const containerPadding = theme.configScreenPadding;

	const containerStyle = Object.assign({}, theme.containerStyle, {
		padding: containerPadding,
		flex: 1,
	});

	function renderSectionTitleHtml(key: string, title: string) {
		return (
			<h2 key={`section_${key}`} style={theme.h2Style}>
				{title}
			</h2>
		);
	}

	function renderSectionRetryAllHtml(key: string, retryAllHandler: any) {
		return (
			<a key={`retry_all_${key}`} href="#" onClick={retryAllHandler} style={retryAllStyle}>
				{_('Retry All')}
			</a>
		);
	}

	const renderSectionHtml = (key: string, section: any) => {
		const itemsHtml = [];

		itemsHtml.push(renderSectionTitleHtml(section.title, section.title));

		for (const n in section.body) {
			if (!section.body.hasOwnProperty(n)) continue;
			const item = section.body[n];
			let text = '';

			let retryLink = null;
			if (typeof item === 'object') {
				if (item.canRetry) {
					const onClick = async () => {
						await item.retryHandler();
						void resfreshScreen();
					};

					retryLink = (
						<a href="#" onClick={onClick} style={retryStyle}>
							{_('Retry')}
						</a>
					);
				}
				text = item.text;
			} else {
				text = item;
			}

			if (!text) text = '\xa0';

			itemsHtml.push(
				<div style={theme.textStyle} key={`item_${n}`}>
					<span>{text}</span>
					{retryLink}
				</div>
			);
		}

		if (section.canRetryAll) {
			itemsHtml.push(renderSectionRetryAllHtml(section.title, section.retryAllHandler));
		}

		return <div key={key}>{itemsHtml}</div>;
	};

	function renderBodyHtml(report: any) {
		const sectionsHtml = [];

		for (let i = 0; i < report.length; i++) {
			const section = report[i];
			if (!section.body.length) continue;
			sectionsHtml.push(renderSectionHtml(`${i}`, section));
		}

		return <div>{sectionsHtml}</div>;
	}

	const body = renderBodyHtml(report);

	return (
		<div style={style}>
			<div style={containerStyle}>
				<a style={theme.textStyle} onClick={() => exportDebugReportClick()} href="#">
					Export debug report
				</a>
				{body}
			</div>
			<ButtonBar
				onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })}
			/>
		</div>
	);
}

const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(StatusScreen);

