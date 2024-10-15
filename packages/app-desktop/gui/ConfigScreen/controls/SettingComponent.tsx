import Setting, { AppType, SettingItemSubType } from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useCallback, useId } from 'react';
import control_PluginsStates from './plugins/PluginsStates';
import bridge from '../../../services/bridge';
import { _ } from '@joplin/lib/locale';
import Button, { ButtonLevel, ButtonSize } from '../../Button/Button';
import FontSearch from './FontSearch';
import * as pathUtils from '@joplin/lib/path-utils';
import SettingLabel from './SettingLabel';
import SettingDescription from './SettingDescription';

const settingKeyToControl: Record<string, typeof control_PluginsStates> = {
	'plugins.states': control_PluginsStates,
};

export interface UpdateSettingValueEvent {
	key: string;
	value: unknown;
}

interface Props {
	themeId: number;
	settingKey: string;
	value: unknown;
	fonts: string[];
	onUpdateSettingValue: (event: UpdateSettingValueEvent)=> void;
	onSettingButtonClick: (key: string)=> void;
}

const SettingComponent: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);

	const output: React.ReactNode = null;

	const updateSettingValue = useCallback((key: string, value: unknown) => {
		props.onUpdateSettingValue({ key, value });
	}, [props.onUpdateSettingValue]);

	const rowStyle = {
		marginBottom: theme.mainPadding * 1.5,
	};

	const controlStyle = {
		display: 'inline-block',
		color: theme.color,
		fontFamily: theme.fontFamily,
		backgroundColor: theme.backgroundColor,
	};

	const textInputBaseStyle: React.CSSProperties = {
		...controlStyle,
		fontFamily: theme.fontFamily,
		border: '1px solid',
		padding: '4px 6px',
		boxSizing: 'border-box',
		borderColor: theme.borderColor4,
		borderRadius: 3,
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 4,
		paddingBottom: 4,
	};

	const key = props.settingKey;
	const md = Setting.settingMetadata(key);

	const descriptionText = Setting.keyDescription(key, AppType.Desktop);
	const inputId = useId();
	const descriptionId = useId();
	const descriptionComp = <SettingDescription id={descriptionId} text={descriptionText}/>;

	if (key in settingKeyToControl) {
		const CustomSettingComponent = settingKeyToControl[key];
		const label = md.label ? <SettingLabel text={md.label()} htmlFor={null} /> : null;
		return (
			<div style={rowStyle}>
				{label}
				<SettingDescription id={descriptionId} text={md.description ? md.description(AppType.Desktop) : null}/>
				<CustomSettingComponent
					value={props.value}
					themeId={props.themeId}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					onChange={(event: any) => {
						updateSettingValue(key, event.value);
					}}
				/>
			</div>
		);
	} else if (md.isEnum) {
		const value = props.value as string;

		const items = [];
		const settingOptions = md.options();
		const array = Setting.enumOptionsToValueLabels(settingOptions, md.optionsOrder ? md.optionsOrder() : [], {
			valueKey: 'key',
			labelKey: 'label',
		});

		for (let i = 0; i < array.length; i++) {
			const e = array[i];
			items.push(
				<option value={e.key.toString()} key={e.key}>
					{settingOptions[e.key]}
				</option>,
			);
		}

		return (
			<div style={rowStyle}>
				<SettingLabel htmlFor={inputId} text={md.label()}/>
				<select
					value={value}
					className='setting-select-control'
					onChange={(event) => {
						updateSettingValue(key, event.target.value);
					}}
					id={inputId}
					aria-describedby={descriptionId}
				>
					{items}
				</select>
				{descriptionComp}
			</div>
		);
	} else if (md.type === Setting.TYPE_BOOL) {
		const value = props.value as boolean;

		const checkboxSize = theme.fontSize * 1.1666666666666;

		return (
			<div style={rowStyle}>
				<div style={{ ...controlStyle, backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
					<input
						id={inputId}
						type="checkbox"
						checked={!!value}
						onChange={event => updateSettingValue(key, event.target.checked)}
						style={{ marginLeft: 0, width: checkboxSize, height: checkboxSize }}

						// Prefer aria-details to aria-describedby for checkbox inputs --
						// on MacOS, VoiceOver reads "checked"/"unchecked" only after reading the
						// potentially-lengthy description. For other input types, the input value
						// is read first.
						aria-details={descriptionId}
					/>
					<label
						className='setting-label -for-checkbox'
						htmlFor={inputId}
					>
						{md.label()}
					</label>
				</div>
				{descriptionComp}
			</div>
		);
	} else if (md.type === Setting.TYPE_STRING) {
		const value = props.value as string;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const inputStyle: any = { ...textInputBaseStyle, width: '50%',
			minWidth: '20em' };
		const inputType = md.secure === true ? 'password' : 'text';

		if (md.subType === 'file_path_and_args' || md.subType === 'file_path' || md.subType === 'directory_path') {
			inputStyle.marginBottom = theme.mainPadding / 2;

			const splitCmd = (cmdString: string) => {
				// Normally not necessary but certain plugins found a way to
				// set the set the value to "undefined", leading to a crash.
				// This is now fixed at the model level but to be sure we
				// check here too, to handle any already existing data.
				// https://github.com/laurent22/joplin/issues/7621
				if (!cmdString) cmdString = '';
				const path = pathUtils.extractExecutablePath(cmdString);
				const args = cmdString.substr(path.length + 1);
				return [pathUtils.unquotePath(path), args];
			};

			const joinCmd = (cmdArray: string[]) => {
				if (!cmdArray[0] && !cmdArray[1]) return '';
				let cmdString = pathUtils.quotePath(cmdArray[0]);
				if (!cmdString) cmdString = '""';
				if (cmdArray[1]) cmdString += ` ${cmdArray[1]}`;
				return cmdString;
			};

			const onPathChange: React.ChangeEventHandler<HTMLInputElement> = event => {
				if (md.subType === 'file_path_and_args') {
					const cmd = splitCmd(value);
					cmd[0] = event.target.value;
					updateSettingValue(key, joinCmd(cmd));
				} else {
					updateSettingValue(key, event.target.value);
				}
			};

			const onArgsChange: React.ChangeEventHandler<HTMLInputElement> = event => {
				const cmd = splitCmd(value);
				cmd[1] = event.target.value;
				updateSettingValue(key, joinCmd(cmd));
			};

			const browseButtonClick = async () => {
				if (md.subType === 'directory_path') {
					const paths = await bridge().showOpenDialog({
						properties: ['openDirectory'],
					});
					if (!paths || !paths.length) return;
					updateSettingValue(key, paths[0]);
				} else {
					const paths = await bridge().showOpenDialog();
					if (!paths || !paths.length) return;

					if (md.subType === 'file_path') {
						updateSettingValue(key, paths[0]);
					} else {
						const cmd = splitCmd(value);
						cmd[0] = paths[0];
						updateSettingValue(key, joinCmd(cmd));
					}
				}
			};

			const cmd = splitCmd(value);
			const path = md.subType === 'file_path_and_args' ? cmd[0] : value;

			const argInputId = `setting_path_arg_${key}`;
			const argComp = md.subType !== 'file_path_and_args' ? null : (
				<div style={{ ...rowStyle, marginBottom: 5 }}>
					<label
						className='setting-label -sub-label'
						htmlFor={argInputId}
					>{_('Arguments:')}</label>
					<input
						type={inputType}
						style={inputStyle}
						onChange={onArgsChange}
						value={cmd[1]}
						spellCheck={false}
						id={argInputId}
						aria-describedby={descriptionId}
					/>
					<div style={{ width: inputStyle.width, minWidth: inputStyle.minWidth }}>
						{descriptionComp}
					</div>
				</div>
			);

			const pathDescriptionId = `setting_path_label_${key}`;
			return (
				<div style={rowStyle}>
					<SettingLabel text={md.label()} htmlFor={inputId}/>
					<div style={{ display: 'flex' }}>
						<div style={{ flex: 1 }}>
							<div style={{ ...rowStyle, marginBottom: 5 }}>
								<div
									className='setting-label -sub-label'
									id={pathDescriptionId}
								>{_('Path:')}</div>
								<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: inputStyle.marginBottom }}>
									<input
										type={inputType}
										style={{ ...inputStyle, marginBottom: 0, marginRight: 5 }}
										onChange={onPathChange}
										value={path}
										spellCheck={false}
										id={inputId}
										aria-describedby={pathDescriptionId}
										aria-details={descriptionId}
									/>
									<Button
										level={ButtonLevel.Secondary}
										title={_('Browse...')}
										onClick={browseButtonClick}
										size={ButtonSize.Small}
									/>
								</div>
								<div style={{ width: inputStyle.width, minWidth: inputStyle.minWidth }}>
									{descriptionComp}
								</div>
							</div>
						</div>
					</div>
					{argComp}
				</div>
			);
		} else {
			const onTextChange: React.ChangeEventHandler<HTMLInputElement> = event => {
				updateSettingValue(key, event.target.value);
			};
			return (
				<div style={rowStyle}>
					<SettingLabel text={md.label()} htmlFor={inputId}/>
					{
						md.subType === SettingItemSubType.FontFamily || md.subType === SettingItemSubType.MonospaceFontFamily ?
							<FontSearch
								type={inputType}
								style={inputStyle}
								value={props.value as string}
								availableFonts={props.fonts}
								onChange={fontFamily => updateSettingValue(key, fontFamily)}
								subtype={md.subType}
								inputId={inputId}
							/> :
							<input
								type={inputType}
								style={inputStyle}
								value={props.value as string|number}
								onChange={onTextChange}
								spellCheck={false}
								id={inputId}
								aria-describedby={descriptionId}
							/>
					}
					<div style={{ width: inputStyle.width, minWidth: inputStyle.minWidth }}>
						{descriptionComp}
					</div>
				</div>
			);
		}
	} else if (md.type === Setting.TYPE_INT) {
		const value = props.value as number;

		const onNumChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
			updateSettingValue(key, event.target.value);
		};

		const label = [md.label()];
		if (md.unitLabel) label.push(`(${md.unitLabel(md.value)})`);

		return (
			<div style={rowStyle}>
				<SettingLabel htmlFor={inputId} text={label.join(' ')}/>
				<input
					type="number"
					style={textInputBaseStyle}
					value={value}
					onChange={onNumChange}
					min={md.minimum}
					max={md.maximum}
					step={md.step}
					spellCheck={false}
					id={inputId}
					aria-describedby={descriptionId}
				/>
				{descriptionComp}
			</div>
		);
	} else if (md.type === Setting.TYPE_BUTTON) {
		const labelComp = md.hideLabel ? null : (
			<SettingLabel text={md.label()} htmlFor={null} />
		);

		return (
			<div style={rowStyle}>
				{labelComp}
				<Button
					level={ButtonLevel.Secondary}
					title={md.label()}
					onClick={md.onClick ? md.onClick : () => props.onSettingButtonClick(key)}
				/>
				{descriptionComp}
			</div>
		);
	} else {
		console.warn(`Type not implemented: ${key}`);
	}

	return output;
};

export default SettingComponent;
