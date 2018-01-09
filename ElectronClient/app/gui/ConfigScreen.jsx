const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const Setting = require('lib/models/Setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const pathUtils = require('lib/path-utils.js');
const { _ } = require('lib/locale.js');

class ConfigScreenComponent extends React.Component {

	constructor() {
		super();

		this.state = {
			settings: {},
		};
	}

	componentWillMount() {
		this.setState({ settings: this.props.settings });
	}

	keyValueToArray(kv) {
		let output = [];
		for (let k in kv) {
			if (!kv.hasOwnProperty(k)) continue;
			output.push({
				key: k,
				label: kv[k],
			});
		}

		output.sort((a, b) => {
			return a.label.toLowerCase() < b.label.toLowerCase() ? -1 : +1;
		});

		return output;
	}

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
			const settings = Object.assign({}, this.state.settings);
			settings[key] = value;
			this.setState({ settings: settings });
		}

		// Component key needs to be key+value otherwise it doesn't update when the settings change.

		const md = Setting.settingMetadata(key);

		if (md.isEnum) {
			let items = [];
			const settingOptions = md.options();
			let array = this.keyValueToArray(settingOptions);
			for (let i = 0; i < array.length; i++) {
				const e = array[i];
				items.push(<option value={e.key.toString()} key={e.key}>{settingOptions[e.key]}</option>);
			}

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}><label>{md.label()}</label></div>
					<select value={value} style={controlStyle} onChange={(event) => { updateSettingValue(key, event.target.value) }}>
						{items}
					</select>
				</div>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			const onCheckboxClick = (event) => {
				updateSettingValue(key, !value)
			}

			return (
				<div key={key} style={rowStyle}>
					<div style={controlStyle}>
						<input id={'setting_checkbox_' + key} type="checkbox" checked={!!value} onChange={(event) => { onCheckboxClick(event) }}/><label onClick={(event) => { onCheckboxClick(event) }} style={labelStyle} htmlFor={'setting_checkbox_' + key}>{md.label()}</label>
					</div>
				</div>
			);
		} else if (md.type === Setting.TYPE_STRING) {
			const onTextChange = (event) => {
				const settings = Object.assign({}, this.state.settings);
				settings[key] = event.target.value;
				this.setState({ settings: settings });
			}

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}><label>{md.label()}</label></div>
					<input type="text" style={controlStyle} value={this.state.settings[key]} onChange={(event) => {onTextChange(event)}} />
				</div>
			);
		} else {
			console.warn('Type not implemented: ' + key);
		}

		return output;
	}

	onSaveClick() {
		for (let n in this.state.settings) {
			if (!this.state.settings.hasOwnProperty(n)) continue;
			Setting.setValue(n, this.state.settings[n]);
		}
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	onCancelClick() {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;
		const settings = this.state.settings;

		const headerStyle = {
			width: style.width,
		};

		const containerStyle = {
			padding: 10,
		};

		const buttonStyle = {
			display: this.state.settings === this.props.settings ? 'none' : 'inline-block',
			marginRight: 10,
		}

		let settingComps = [];
		let keys = Setting.keys(true, 'desktop');
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (!(key in settings)) {
				console.warn('Missing setting: ' + key);
				continue;
			}
			const md = Setting.settingMetadata(key);
			if (md.show && !md.show(settings)) continue;
			const comp = this.settingToComponent(key, settings[key]);
			if (!comp) continue;
			settingComps.push(comp);
		}

		return (
			<div style={style}>
				<Header style={headerStyle} />
				<div style={containerStyle}>
					<div style={Object.assign({}, theme.textStyle, {marginBottom: 20})}>
						{_('Notes and settings are stored in: %s', pathUtils.toSystemSlashes(Setting.value('profileDir'), process.platform))}
					</div>
					{ settingComps }
					<button onClick={() => {this.onSaveClick()}} style={buttonStyle}>{_('Save')}</button>
					<button onClick={() => {this.onCancelClick()}} style={buttonStyle}>{_('Cancel')}</button>
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