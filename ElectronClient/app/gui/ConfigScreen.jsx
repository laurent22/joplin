const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const Setting = require('lib/models/Setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const pathUtils = require('lib/path-utils.js');
const { _ } = require('lib/locale.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const shared = require('lib/components/shared/config-shared.js');

class ConfigScreenComponent extends React.Component {

	constructor() {
		super();

		shared.init(this);

		this.checkSyncConfig_ = async () => {
			await shared.checkSyncConfig(this, this.state.settings);
		}

		this.rowStyle_ = {
			marginBottom: 10,
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

		return output;
	}

	settingToComponent(key, value) {
		const theme = themeStyle(this.props.theme);

		let output = null;

		const rowStyle = this.rowStyle_;

		const labelStyle = Object.assign({}, theme.textStyle, {
			display: 'inline-block',
			marginRight: 10,
		});

		const controlStyle = {
			display: 'inline-block',
		};

		const descriptionStyle = Object.assign({}, theme.textStyle, {
			color: theme.colorFaded,
			marginTop: 5,
			fontStyle: 'italic',
		});

		const updateSettingValue = (key, value) => {
			return shared.updateSettingValue(this, key, value);
		}

		// Component key needs to be key+value otherwise it doesn't update when the settings change.

		const md = Setting.settingMetadata(key);

		const descriptionText = Setting.keyDescription(key, 'desktop');
		const descriptionComp = descriptionText ? (
			<div style={descriptionStyle}>
				{descriptionText}
			</div>
		) : null;

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
					{ descriptionComp }
				</div>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			const onCheckboxClick = (event) => {
				updateSettingValue(key, !value)
			}

			// Hack: The {key+value.toString()} is needed as otherwise the checkbox doesn't update when the state changes.
			// There's probably a better way to do this but can't figure it out.

			return (
				<div key={key+value.toString()} style={rowStyle}>
					<div style={controlStyle}>
						<input id={'setting_checkbox_' + key} type="checkbox" checked={!!value} onChange={(event) => { onCheckboxClick(event) }}/><label onClick={(event) => { onCheckboxClick(event) }} style={labelStyle} htmlFor={'setting_checkbox_' + key}>{md.label()}</label>						
						{ descriptionComp }
					</div>
				</div>
			);
		} else if (md.type === Setting.TYPE_STRING) {
			const onTextChange = (event) => {
				updateSettingValue(key, event.target.value);
			}

			const inputStyle = Object.assign({}, controlStyle, { width: '50%', minWidth: '20em' });
			const inputType = md.secure === true ? 'password' : 'text';

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}><label>{md.label()}</label></div>
					<input type={inputType} style={inputStyle} value={this.state.settings[key]} onChange={(event) => {onTextChange(event)}} />
					{ descriptionComp }
				</div>
			);
		} else if (md.type === Setting.TYPE_INT) {
			const onNumChange = (event) => {
				updateSettingValue(key, event.target.value);
			};

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}><label>{md.label()}</label></div>
					<input type="number" style={controlStyle} value={this.state.settings[key]} onChange={(event) => {onNumChange(event)}} min={md.minimum} max={md.maximum} step={md.step}/>
					{ descriptionComp }
				</div>
			);
		} else {
			console.warn('Type not implemented: ' + key);
		}

		return output;
	}

	onSaveClick() {
		shared.saveSettings(this);
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	onCancelClick() {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = Object.assign({}, this.props.style, { overflow: 'auto' });
		const settings = this.state.settings;

		const headerStyle = {
			width: style.width,
		};

		const containerStyle = {
			padding: 10,
		};

		const buttonStyle = {
			display: this.state.changedSettingKeys.length ? 'inline-block' : 'none',
			marginRight: 10,
		}

		const settingComps = shared.settingsToComponents(this, 'desktop', settings);

		const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);

		if (syncTargetMd.supportsConfigCheck) {
			const messages = shared.checkSyncConfigMessages(this);
			const statusStyle = Object.assign({}, theme.textStyle, { marginTop: 10 });
			const statusComp = !messages.length ? null : (
				<div style={statusStyle}>
					{messages[0]}
					{messages.length >= 1 ? (<p>{messages[1]}</p>) : null}
				</div>);

			settingComps.push(
				<div key="check_sync_config_button" style={this.rowStyle_}>
					<button disabled={this.state.checkSyncConfigResult === 'checking'} onClick={this.checkSyncConfig_}>{_('Check synchronisation configuration')}</button>
					{ statusComp }
				</div>);
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