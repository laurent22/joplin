const React = require('react');
const { connect } = require('react-redux');
const Setting = require('lib/models/Setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { ReportService } = require('lib/services/report.js');
const fs = require('fs-extra');

class StatusScreenComponent extends React.Component {
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

	async exportDebugReportClick() {
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

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;

		const headerStyle = Object.assign({}, theme.headerStyle, { width: style.width });
		const retryStyle = Object.assign({}, theme.urlStyle, { marginLeft: 5 });

		const containerPadding = 10;

		const containerStyle = Object.assign({}, theme.containerStyle, {
			padding: containerPadding,
			height: style.height - theme.headerHeight - containerPadding * 2,
		});

		function renderSectionTitleHtml(key, title) {
			return (
				<h2 key={`section_${key}`} style={theme.h2Style}>
					{title}
				</h2>
			);
		}

		const renderSectionHtml = (key, section) => {
			let itemsHtml = [];

			itemsHtml.push(renderSectionTitleHtml(section.title, section.title));

			for (let n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				let item = section.body[n];
				let text = '';

				let retryLink = null;
				if (typeof item === 'object') {
					if (item.canRetry) {
						const onClick = async () => {
							await item.retryHandler();
							this.resfreshScreen();
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

			return <div key={key}>{itemsHtml}</div>;
		};

		function renderBodyHtml(report) {
			let sectionsHtml = [];

			for (let i = 0; i < report.length; i++) {
				let section = report[i];
				if (!section.body.length) continue;
				sectionsHtml.push(renderSectionHtml(i, section));
			}

			return <div>{sectionsHtml}</div>;
		}

		let body = renderBodyHtml(this.state.report);

		return (
			<div style={style}>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					<a style={theme.textStyle} onClick={() => this.exportDebugReportClick()} href="#">
						Export debug report
					</a>
					{body}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

const StatusScreen = connect(mapStateToProps)(StatusScreenComponent);

module.exports = { StatusScreen };
