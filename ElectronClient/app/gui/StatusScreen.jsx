const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { Setting } = require('lib/models/setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { ReportService } = require('lib/services/report.js');
const { BaseItem } = require('lib/models/base-item.js');

class StatusScreenComponent extends React.Component {

	constructor() {
		super();
		this.state = {
			report: [],
			disabledItems: [],
		};
	}

	componentWillMount() {
		this.resfreshScreen();
	}

	async resfreshScreen() {
		const service = new ReportService();
		const report = await service.status(Setting.value('sync.target'));
		const disabledItems = await BaseItem.syncDisabledItems();
		this.setState({
			report: report,
			disabledItems: disabledItems,
		});
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;

		const headerStyle = {
			width: style.width,
		};

		const containerPadding = 10;

		const containerStyle = {
			padding: containerPadding,
			overflowY: 'auto',
			height: style.height - theme.headerHeight - containerPadding * 2,
		};

		function renderSectionTitleHtml(key, title) {
			return <h2 key={'section_' + key} style={theme.h2Style}>{title}</h2>
		}

		function renderSectionHtml(key, section) {
			let itemsHtml = [];

			itemsHtml.push(renderSectionTitleHtml(section.title, section.title));

			for (let n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				itemsHtml.push(<div style={theme.textStyle} key={'item_' + n}>{section.body[n]}</div>);
			}

			return (
				<div key={key}>
					{itemsHtml}
				</div>
			);
		}

		function renderBodyHtml(report, disabledItems) {
			let output = [];
			let baseStyle = {
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 2,
				paddingBottom: 2,
				flex: 0,
				color: theme.color,
				fontSize: theme.fontSize,
			};

			let sectionsHtml = [];

			if (disabledItems.length) {
				const titleHtml = [renderSectionTitleHtml('disabled_sync_items', _('Items that cannot be synchronised'))];
				const trsHtml = [];
				for (let i = 0; i < disabledItems.length; i++) {
					const row = disabledItems[i];
					trsHtml.push(<tr key={'item_' + i}><td style={theme.textStyle}>{row.item.title}</td><td style={theme.textStyle}>{row.syncInfo.sync_disabled_reason}</td></tr>);
				}

				sectionsHtml.push(
					<div key={'disabled_sync_items'}>
						{titleHtml}
						<table>
							<tbody>
								<tr><th style={theme.textStyle}>{_('Name')}</th><th style={theme.textStyle}>{_('Reason')}</th></tr>
								{trsHtml}
							</tbody>
						</table>
					</div>
				);
			}

			for (let i = 0; i < report.length; i++) {
				let section = report[i];
				if (!section.body.length) continue;
				sectionsHtml.push(renderSectionHtml(i, section));
			}

			return (
				<div>
					{sectionsHtml}
				</div>
			);
		}

		console.info(this.state.disabledItems);

		let body = renderBodyHtml(this.state.report, this.state.disabledItems);
		
		return (
			<div style={style}>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					{body}
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

const StatusScreen = connect(mapStateToProps)(StatusScreenComponent);

module.exports = { StatusScreen };