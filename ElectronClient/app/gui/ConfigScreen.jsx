const React = require('react');
const { connect } = require('react-redux');
const Setting = require('lib/models/Setting.js');
const { bridge } = require('electron').remote.require('./bridge');
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
		};

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

	sectionToComponent(key, section, settings) {
		const theme = themeStyle(this.props.theme);
		const settingComps = [];

		for (let i = 0; i < section.metadatas.length; i++) {
			const md = section.metadatas[i];

			const settingComp = this.settingToComponent(md.key, settings[md.key]);
			settingComps.push(settingComp);
		}

		const sectionStyle = {
			marginBottom: 20,
		};

		const headerStyle = Object.assign({}, theme.headerStyle, {
			borderBottomWidth: 1,
			borderBottomColor: theme.dividerColor,
			borderBottomStyle: 'solid',
			paddingBottom: '.4em',
		});

		if (section.name === 'general') {
			sectionStyle.borderTopWidth = 0;
		}

		const noteComp = section.name !== 'general' ? null : <div style={Object.assign({}, theme.textStyle, { marginBottom: 10 })}>{_('Notes and settings are stored in: %s', pathUtils.toSystemSlashes(Setting.value('profileDir'), process.platform))}</div>;

		if (section.name === 'sync') {
			const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);

			if (syncTargetMd.supportsConfigCheck) {
				const messages = shared.checkSyncConfigMessages(this);
				const statusStyle = Object.assign({}, theme.textStyle, { marginTop: 10 });
				const statusComp = !messages.length ? null : (
					<div style={statusStyle}>
						{messages[0]}
						{messages.length >= 1 ? <p>{messages[1]}</p> : null}
					</div>
				);

				settingComps.push(
					<div key="check_sync_config_button" style={this.rowStyle_}>
						<button disabled={this.state.checkSyncConfigResult === 'checking'} style={theme.buttonStyle} onClick={this.checkSyncConfig_}>
							{_('Check synchronisation configuration')}
						</button>
						{statusComp}
					</div>
				);
			}
		}

		return (
			<div key={key} style={sectionStyle}>
				<h2 style={headerStyle}>{Setting.sectionNameToLabel(section.name)}</h2>
				{noteComp}
				<div>{settingComps}</div>
			</div>
		);
	}

	settingToComponent(key, value) {
		const theme = themeStyle(this.props.theme);

		let output = null;

		const rowStyle = this.rowStyle_;

		const labelStyle = Object.assign({}, theme.textStyle, {
			display: 'inline-block',
			marginRight: 10,
			color: theme.color,
		});

		const subLabel = Object.assign({}, labelStyle, {
			opacity: 0.7,
			marginBottom: Math.round(rowStyle.marginBottom * 0.7),
		});

		const invisibleLabel = Object.assign({}, labelStyle, {
			opacity: 0,
		});

		const controlStyle = {
			display: 'inline-block',
			color: theme.color,
			backgroundColor: theme.backgroundColor,
		};

		const descriptionStyle = Object.assign({}, theme.textStyle, {
			color: theme.colorFaded,
			marginTop: 5,
			fontStyle: 'italic',
			maxWidth: '70em',
		});

		const updateSettingValue = (key, value) => {
			// console.info(key + ' = ' + value);
			return shared.updateSettingValue(this, key, value);
		};

		// Component key needs to be key+value otherwise it doesn't update when the settings change.

		const md = Setting.settingMetadata(key);

		const descriptionText = Setting.keyDescription(key, 'desktop');
		const descriptionComp = descriptionText ? <div style={descriptionStyle}>{descriptionText}</div> : null;

		if (md.isEnum) {
			let items = [];
			const settingOptions = md.options();
			let array = this.keyValueToArray(settingOptions);
			for (let i = 0; i < array.length; i++) {
				const e = array[i];
				items.push(
					<option value={e.key.toString()} key={e.key}>
						{settingOptions[e.key]}
					</option>
				);
			}

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}>
						<label>{md.label()}</label>
					</div>
					<select
						value={value}
						style={controlStyle}
						onChange={event => {
							updateSettingValue(key, event.target.value);
						}}
					>
						{items}
					</select>
					{descriptionComp}
				</div>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			const onCheckboxClick = event => {
				updateSettingValue(key, !value);
			};

			// Hack: The {key+value.toString()} is needed as otherwise the checkbox doesn't update when the state changes.
			// There's probably a better way to do this but can't figure it out.

			return (
				<div key={key + value.toString()} style={rowStyle}>
					<div style={controlStyle}>
						<input
							id={'setting_checkbox_' + key}
							type="checkbox"
							checked={!!value}
							onChange={event => {
								onCheckboxClick(event);
							}}
						/>
						<label
							onClick={event => {
								onCheckboxClick(event);
							}}
							style={labelStyle}
							htmlFor={'setting_checkbox_' + key}
						>
							{md.label()}
						</label>
						{descriptionComp}
					</div>
				</div>
			);
		} else if (md.type === Setting.TYPE_STRING) {
			const inputStyle = Object.assign({}, controlStyle, {
				width: '50%',
				minWidth: '20em',
				border: '1px solid',
			});
			const inputType = md.secure === true ? 'password' : 'text';

			if (md.subType === 'file_path_and_args') {
				inputStyle.marginBottom = subLabel.marginBottom;

				const splitCmd = cmdString => {
					const path = pathUtils.extractExecutablePath(cmdString);
					const args = cmdString.substr(path.length + 1);
					return [pathUtils.unquotePath(path), args];
				};

				const joinCmd = cmdArray => {
					if (!cmdArray[0] && !cmdArray[1]) return '';
					let cmdString = pathUtils.quotePath(cmdArray[0]);
					if (!cmdString) cmdString = '""';
					if (cmdArray[1]) cmdString += ' ' + cmdArray[1];
					return cmdString;
				};

				const onPathChange = event => {
					const cmd = splitCmd(this.state.settings[key]);
					cmd[0] = event.target.value;
					updateSettingValue(key, joinCmd(cmd));
				};

				const onArgsChange = event => {
					const cmd = splitCmd(this.state.settings[key]);
					cmd[1] = event.target.value;
					updateSettingValue(key, joinCmd(cmd));
				};

				const browseButtonClick = () => {
					const paths = bridge().showOpenDialog();
					if (!paths || !paths.length) return;
					const cmd = splitCmd(this.state.settings[key]);
					cmd[0] = paths[0];
					updateSettingValue(key, joinCmd(cmd));
				};

				const cmd = splitCmd(this.state.settings[key]);

				return (
					<div key={key} style={rowStyle}>
						<div style={{ display: 'flex' }}>
							<div style={{ flex: 0, whiteSpace: 'nowrap' }}>
								<div style={labelStyle}>
									<label>{md.label()}</label>
								</div>
							</div>
							<div style={{ flex: 0 }}>
								<div style={subLabel}>Path:</div>
								<div style={subLabel}>Arguments:</div>
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: inputStyle.marginBottom }}>
									<input
										type={inputType}
										style={Object.assign({}, inputStyle, { marginBottom: 0 })}
										onChange={event => {
											onPathChange(event);
										}}
										value={cmd[0]}
									/>
									<button onClick={browseButtonClick} style={Object.assign({}, theme.buttonStyle, { marginLeft: 5, minHeight: 20, height: 20 })}>
										{_('Browse...')}
									</button>
								</div>
								<input
									type={inputType}
									style={inputStyle}
									onChange={event => {
										onArgsChange(event);
									}}
									value={cmd[1]}
								/>
							</div>
						</div>

						<div style={{ display: 'flex' }}>
							<div style={{ flex: 0, whiteSpace: 'nowrap' }}>
								<div style={invisibleLabel}>
									<label>{md.label()}</label>
								</div>
							</div>
							<div style={{ flex: 1 }}>{descriptionComp}</div>
						</div>
					</div>
				);
			} else {
				const onTextChange = event => {
					updateSettingValue(key, event.target.value);
				};

				return (
					<div key={key} style={rowStyle}>
						<div style={labelStyle}>
							<label>{md.label()}</label>
						</div>
						<input
							type={inputType}
							style={inputStyle}
							value={this.state.settings[key]}
							onChange={event => {
								onTextChange(event);
							}}
						/>
						{descriptionComp}
					</div>
				);
			}
		} else if (md.type === Setting.TYPE_INT) {
			const onNumChange = event => {
				updateSettingValue(key, event.target.value);
			};

			const label = [md.label()];
			if (md.unitLabel) label.push('(' + md.unitLabel() + ')');

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}>
						<label>{label.join(' ')}</label>
					</div>
					<input
						type="number"
						style={controlStyle}
						value={this.state.settings[key]}
						onChange={event => {
							onNumChange(event);
						}}
						min={md.minimum}
						max={md.maximum}
						step={md.step}
					/>
					{descriptionComp}
				</div>
			);
		} else {
			console.warn('Type not implemented: ' + key);
		}

		return output;
	}

	onApplyClick() {
		shared.saveSettings(this);
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

		const style = Object.assign(
			{
				backgroundColor: theme.backgroundColor,
			},
			this.props.style,
			{
				overflow: 'hidden',
				display: 'flex',
				flexDirection: 'column',
			}
		);

		let settings = this.state.settings;

		const containerStyle = Object.assign({}, theme.containerStyle, { padding: 10, paddingTop: 0 });

		const hasChanges = !!this.state.changedSettingKeys.length;

		const buttonStyle = Object.assign({}, theme.buttonStyle, {
			display: 'inline-block',
			marginRight: 10,
		});

		const buttonStyleApprove = Object.assign({}, buttonStyle, {
			opacity: hasChanges ? 1 : theme.disabledOpacity,
		});

		const settingComps = shared.settingsToComponents2(this, 'desktop', settings);

		const buttonBarStyle = {
			display: 'flex',
			alignItems: 'center',
			padding: 15,
			borderBottomWidth: 1,
			borderBottomStyle: 'solid',
			borderBottomColor: theme.dividerColor,
		};

		return (
			<div style={style}>
				<div style={buttonBarStyle}>
					<button
						onClick={() => {
							this.onCancelClick();
						}}
						style={buttonStyle}
					>
						<i style={theme.buttonIconStyle} className={'fa fa-chevron-left'}></i>
						{_('Cancel')}
					</button>
					<button
						disabled={!hasChanges}
						onClick={() => {
							this.onSaveClick();
						}}
						style={buttonStyleApprove}
					>
						{_('OK')}
					</button>
					<button
						disabled={!hasChanges}
						onClick={() => {
							this.onApplyClick();
						}}
						style={buttonStyleApprove}
					>
						{_('Apply')}
					</button>
				</div>
				<div style={containerStyle}>{settingComps}</div>
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

const ConfigScreen = connect(mapStateToProps)(ConfigScreenComponent);

module.exports = { ConfigScreen };
