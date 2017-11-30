const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { Setting } = require('lib/models/setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class ConfigScreenComponent extends React.Component {

	settingToComponent(key, value) {
		const theme = themeStyle(this.props.theme);

		let output = null;

		const rowStyle = {
			marginBottom: 10,
		};

		const labelStyle = Object.assign({}, theme.textStyle, {
			display: 'inline-block',
			marginRight: 10,
		});

		const controlStyle = {
			display: 'inline-block',
		};

		const updateSettingValue = (key, value) => {
			Setting.setValue(key, value);
		}

		// Component key needs to be key+value otherwise it doesn't update when the settings change.

		const md = Setting.settingMetadata(key);

		if (md.isEnum) {
			let items = [];
			const settingOptions = md.options();
			for (let k in settingOptions) {
				if (!settingOptions.hasOwnProperty(k)) continue;
				items.push(<option value={k.toString()} key={k}>{settingOptions[k]}</option>);
			}

			return (
				<div key={key+value} style={rowStyle}>
					<div style={labelStyle}><label>{md.label()}</label></div>
					<select value={value} style={controlStyle} onChange={(event) => { updateSettingValue(key, event.target.value) }}>
						{items}
					</select>
				</div>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			return (
				<div key={key+value} style={rowStyle}>
					<div style={controlStyle}>
						<label><input type="checkbox" defaultChecked={!!value} onChange={(event) => { updateSettingValue(key, !!event.target.checked) }}/><span style={labelStyle}> {md.label()}</span></label>
					</div>
				</div>
			);
		}

		return output;
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;
		const settings = this.props.settings;

		const headerStyle = {
			width: style.width,
		};

		const containerStyle = {
			padding: 10,
		};

		let settingComps = [];
		let keys = Setting.keys(true, 'desktop');
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (key === 'sync.target') continue;
			if (!(key in settings)) {
				console.warn('Missing setting: ' + key);
				continue;
			}
			const comp = this.settingToComponent(key, settings[key]);
			if (!comp) continue;
			settingComps.push(comp);
		}

		return (
			<div style={style}>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					{ settingComps }
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

const ConfigScreen = connect(mapStateToProps)(ConfigScreenComponent);

module.exports = { ConfigScreen };