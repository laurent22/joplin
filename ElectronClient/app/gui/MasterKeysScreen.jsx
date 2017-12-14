const React = require('react');
const { connect } = require('react-redux');
const MasterKeys = require('lib/models/MasterKey');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { time } = require('lib/time-utils.js');

class MasterKeysScreenComponent extends React.Component {

	renderMasterKey(mk) {
		return (
			<tr key={mk.id}>
				<td>{mk.id}</td>
				<td>{mk.source_application}</td>
				<td>{time.formatMsToLocal(mk.created_time)}</td>
				<td>{time.formatMsToLocal(mk.update_time)}</td>
			</tr>
		);
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const masterKeys = this.props.masterKeys;

		const headerStyle = {
			width: style.width,
		};

		const mkComps = [];

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			mkComps.push(this.renderMasterKey(mk));
		}

		return (
			<div>
				<Header style={headerStyle} />
				<table>
					<tbody>
						<tr>
							<th>{_('ID')}</th><th>{_('Source')}</th><th>{_('Created')}</th><th>{_('Updated')}</th>
						</tr>
						{mkComps}
					</tbody>
				</table>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		masterKeys: state.masterKeys,
	};
};

const MasterKeysScreen = connect(mapStateToProps)(MasterKeysScreenComponent);

module.exports = { MasterKeysScreen };