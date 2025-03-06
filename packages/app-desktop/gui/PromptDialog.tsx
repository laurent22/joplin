import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { focus } from '@joplin/lib/utils/focusHandler';
import Dialog from './Dialog';
import { ChangeEvent } from 'react';
import { formatDateTimeLocalToMs, isValidDate } from '@joplin/utils/time';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	defaultValue: any;
	visible: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	buttons: any[];
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClose: Function;
	inputType: string;
	description: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	answer?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	autocomplete: any;
	label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default class PromptDialog extends React.Component<Props, any> {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private answerInput_: any;
	private focusInput_: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;
	private styleKey_: string;
	private menuIsOpened_ = false;

	public constructor(props: Props) {
		super(props);

		this.answerInput_ = React.createRef();

		this.select_menuOpen = this.select_menuOpen.bind(this);
		this.select_menuClose = this.select_menuClose.bind(this);
	}

	public UNSAFE_componentWillMount() {
		this.setState({
			visible: false,
			answer: this.props.defaultValue ? this.props.defaultValue : '',
		});
		this.focusInput_ = true;
		this.menuIsOpened_ = false;
	}

	public UNSAFE_componentWillReceiveProps(newProps: Props) {
		if ('visible' in newProps && newProps.visible !== this.props.visible) {
			this.setState({ visible: newProps.visible });
			if (newProps.visible) this.focusInput_ = true;
		}

		if ('defaultValue' in newProps && newProps.defaultValue !== this.props.defaultValue) {
			this.setState({ answer: newProps.defaultValue });
		}
	}

	private select_menuOpen() {
		this.menuIsOpened_ = true;
	}

	private select_menuClose() {
		this.menuIsOpened_ = false;
	}

	public componentDidUpdate() {
		if (this.focusInput_ && this.answerInput_.current) focus('PromptDialog::componentDidUpdate', this.answerInput_.current);
		this.focusInput_ = false;
	}

	public styles(themeId: number, visible: boolean) {
		const styleKey = `${themeId}_${visible}`;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styleKey_ = styleKey;

		this.styles_ = {};

		this.styles_.button = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.label = {
			marginRight: 5,
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			verticalAlign: 'middle',
		};

		this.styles_.input = {
			width: 'calc(0.5 * var(--prompt-width))',
			maxWidth: 400,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.select = {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			control: (provided: any) => {
				return { ...provided,
					minWidth: 'calc(var(--prompt-width) * 0.2)',
					maxWidth: 'calc(var(--prompt-width) * 0.5)',
					fontFamily: theme.fontFamily,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			input: (provided: any) => {
				return { ...provided,
					minWidth: '20px',
					color: theme.color,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			menu: (provided: any) => {
				return { ...provided,
					color: theme.color,
					fontFamily: theme.fontFamily,
					backgroundColor: theme.backgroundColor,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			option: (provided: any, state: any) => {
				return { ...provided,
					color: theme.color,
					fontFamily: theme.fontFamily,
					paddingLeft: `${10 + (state.data.indentDepth || 0) * 20}px`,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			multiValueLabel: (provided: any) => {
				return { ...provided,
					fontFamily: theme.fontFamily,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			multiValueRemove: (provided: any) => {
				return { ...provided,
					color: theme.color,
				};
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.styles_.selectTheme = (tagTheme: any) => {
			return { ...tagTheme,
				borderRadius: 2,
				colors: { ...tagTheme.colors,
					primary: theme.raisedBackgroundColor,
					primary25: theme.raisedBackgroundColor,
					neutral0: theme.backgroundColor,
					neutral5: theme.backgroundColor,
					neutral10: theme.raisedBackgroundColor,
					neutral20: theme.raisedBackgroundColor,
					neutral30: theme.raisedBackgroundColor,
					neutral40: theme.color,
					neutral50: theme.color,
					neutral60: theme.color,
					neutral70: theme.color,
					neutral80: theme.color,
					neutral90: theme.color,
					danger: theme.backgroundColor,
					dangerLight: theme.colorError2,
				},
			};
		};

		this.styles_.desc = { ...theme.textStyle, marginTop: 10 };

		return this.styles_;
	}

	public render() {
		if (!this.state.visible) return null;

		const theme = themeStyle(this.props.themeId);
		const buttonTypes = this.props.buttons ? this.props.buttons : ['ok', 'cancel'];

		const styles = this.styles(this.props.themeId, this.state.visible);

		const onClose = (accept: boolean, buttonType: string = null) => {
			if (this.props.onClose) {
				let outputAnswer = this.state.answer;
				if (this.props.inputType === 'datetime') {
					outputAnswer = isValidDate(outputAnswer) ? formatDateTimeLocalToMs(outputAnswer) : null;
				}
				this.props.onClose(accept ? outputAnswer : null, buttonType);
			}
			this.setState({ visible: false, answer: '' });
		};

		const onChange = (event: ChangeEvent<HTMLInputElement>) => {
			this.setState({ answer: event.target.value });
		};

		// const anythingToDate = (o) => {
		// 	if (o && o.toDate) return o.toDate();
		// 	if (!o) return null;
		// 	let m = moment(o, time.dateTimeFormat());
		// 	if (m.isValid()) return m.toDate();
		// 	m = moment(o, time.dateFormat());
		// 	return m.isValid() ? m.toDate() : null;
		// }

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const onSelectChange = (newValue: any) => {
			this.setState({ answer: newValue });
			this.focusInput_ = true;
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const onKeyDown = (event: any) => {
			if (event.key === 'Enter') {
				// If the dropdown is open, we don't close the dialog - instead
				// the currently item will be selected. If it is closed however
				// we confirm the dialog.
				if ((this.props.inputType === 'tags' || this.props.inputType === 'dropdown') && this.menuIsOpened_) {
					// Do nothing
				} else {
					onClose(true);
				}
			} else if (event.key === 'Escape') {
				onClose(false);
			}
		};

		const descComp = this.props.description ? <div style={styles.desc}>{this.props.description}</div> : null;

		let inputComp = null;

		if (this.props.inputType === 'datetime') {
			inputComp = <input
				defaultValue={this.state.answer}
				onChange={onChange}
				type="datetime-local"
				className='datetime-picker'
				style={styles.input}
			/>;
		} else if (this.props.inputType === 'tags') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			inputComp = <CreatableSelect className="tag-selector" onMenuOpen={this.select_menuOpen} onMenuClose={this.select_menuClose} styles={styles.select} theme={styles.selectTheme} ref={this.answerInput_} value={this.state.answer} placeholder="" components={makeAnimated()} isMulti={true} isClearable={false} backspaceRemovesValue={true} options={this.props.autocomplete} onChange={onSelectChange} onKeyDown={(event: any) => onKeyDown(event)} />;
		} else if (this.props.inputType === 'dropdown') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			inputComp = <Select className="item-selector" onMenuOpen={this.select_menuOpen} onMenuClose={this.select_menuClose} styles={styles.select} theme={styles.selectTheme} ref={this.answerInput_} components={makeAnimated()} value={this.props.answer} defaultValue={this.props.defaultValue} isClearable={false} options={this.props.autocomplete} onChange={onSelectChange} onKeyDown={(event: any) => onKeyDown(event)} />;
		} else {
			inputComp = <input style={styles.input} ref={this.answerInput_} value={this.state.answer} type="text" onChange={event => onChange(event)} onKeyDown={event => onKeyDown(event)} />;
		}

		const buttonComps = [];
		if (buttonTypes.indexOf('create') >= 0) {
			buttonComps.push(
				<button key="create" disabled={!this.state.answer} style={styles.button} onClick={() => onClose(true, 'create')}>
					{_('Create')}
				</button>,
			);
		}
		if (buttonTypes.indexOf('ok') >= 0) {
			buttonComps.push(
				<button key="ok" disabled={!this.state.answer} style={styles.button} onClick={() => onClose(true, 'ok')}>
					{_('OK')}
				</button>,
			);
		}
		if (buttonTypes.indexOf('cancel') >= 0) {
			buttonComps.push(
				<button key="cancel" style={styles.button} onClick={() => onClose(false, 'cancel')}>
					{_('Cancel')}
				</button>,
			);
		}
		if (buttonTypes.indexOf('clear') >= 0) {
			buttonComps.push(
				<button key="clear" style={styles.button} onClick={() => onClose(false, 'clear')}>
					{_('Clear')}
				</button>,
			);
		}

		return (
			<Dialog className='prompt-dialog' contentStyle={styles.dialog}>
				<label style={styles.label}>{this.props.label ? this.props.label : ''}</label>
				<div style={{ display: 'inline-block', color: 'black', backgroundColor: theme.backgroundColor }}>
					{inputComp}
					{descComp}
				</div>
				<div style={{ textAlign: 'right', marginTop: 10 }}>{buttonComps}</div>
			</Dialog>
		);
	}
}
