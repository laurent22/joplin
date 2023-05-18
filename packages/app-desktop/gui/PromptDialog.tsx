import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import time from '@joplin/lib/time';
const Datetime = require('react-datetime').default;
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
interface Props {
	themeId: number;
	defaultValue: any;
	visible: boolean;
	style: any;
	buttons: any[];
	onClose: Function;
	inputType: string;
	description: string;
	answer?: any;
	autocomplete: any;
	label: string;
}

export default class PromptDialog extends React.Component<Props, any> {

	private answerInput_: any;
	private focusInput_: boolean;
	private styles_: any;
	private styleKey_: string;
	private menuIsOpened_: boolean = false;

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
		if (this.focusInput_ && this.answerInput_.current) this.answerInput_.current.focus();
		this.focusInput_ = false;
	}

	public styles(themeId: number, width: number, height: number, visible: boolean) {
		const styleKey = `${themeId}_${width}_${height}_${visible}`;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styleKey_ = styleKey;

		this.styles_ = {};

		const paddingTop = 20;

		this.styles_.modalLayer = {
			zIndex: 9999,
			position: 'absolute',
			top: 0,
			left: 0,
			width: width,
			height: height,
			backgroundColor: 'rgba(0,0,0,0.6)',
			display: visible ? 'flex' : 'none',
			alignItems: 'flex-start',
			justifyContent: 'center',
			paddingTop: `${paddingTop}px`,
		};

		this.styles_.promptDialog = {
			backgroundColor: theme.backgroundColor,
			padding: 16,
			display: 'inline-block',
			maxWidth: width * 0.5,
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
		};

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
			width: 0.5 * width,
			maxWidth: 400,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.select = {
			control: (provided: any) =>
				Object.assign(provided, {
					minWidth: width * 0.2,
					maxWidth: width * 0.5,
					fontFamily: theme.fontFamily,
				}),
			input: (provided: any) =>
				Object.assign(provided, {
					minWidth: '20px',
					color: theme.color,
				}),
			menu: (provided: any) =>
				Object.assign(provided, {
					color: theme.color,
					fontFamily: theme.fontFamily,
					backgroundColor: theme.backgroundColor,
				}),
			option: (provided: any, state: any) =>
				Object.assign(provided, {
					color: theme.color,
					fontFamily: theme.fontFamily,
					paddingLeft: `${10 + (state.data.indentDepth || 0) * 20}px`,
				}),
			multiValueLabel: (provided: any) =>
				Object.assign(provided, {
					fontFamily: theme.fontFamily,
				}),
			multiValueRemove: (provided: any) =>
				Object.assign(provided, {
					color: theme.color,
				}),
		};

		this.styles_.selectTheme = (tagTheme: any) =>
			Object.assign(tagTheme, {
				borderRadius: 2,
				colors: Object.assign(tagTheme.colors, {
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
				}),
			});

		this.styles_.desc = Object.assign({}, theme.textStyle, {
			marginTop: 10,
		});

		return this.styles_;
	}

	public render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);
		const buttonTypes = this.props.buttons ? this.props.buttons : ['ok', 'cancel'];

		const styles = this.styles(this.props.themeId, style.width, style.height, this.state.visible);

		const onClose = (accept: boolean, buttonType: string = null) => {
			if (this.props.onClose) {
				let outputAnswer = this.state.answer;
				if (this.props.inputType === 'datetime') {
					// outputAnswer = anythingToDate(outputAnswer);
					outputAnswer = time.anythingToDateTime(outputAnswer);
				}
				this.props.onClose(accept ? outputAnswer : null, buttonType);
			}
			this.setState({ visible: false, answer: '' });
		};

		const onChange = (event: any) => {
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

		const onDateTimeChange = (momentObject: any) => {
			this.setState({ answer: momentObject });
		};

		const onSelectChange = (newValue: any) => {
			this.setState({ answer: newValue });
			this.focusInput_ = true;
		};

		const onKeyDown = (event: any) => {
			if (event.key === 'Enter') {
				// If the dropdown is open, we don't close the dialog - instead
				// the currently item will be selcted. If it is closed however
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
			inputComp = <Datetime className="datetime-picker" value={this.state.answer} inputProps={{ style: styles.input }} dateFormat={time.dateFormat()} timeFormat={time.timeFormat()} onChange={(momentObject: any) => onDateTimeChange(momentObject)} />;
		} else if (this.props.inputType === 'tags') {
			inputComp = <CreatableSelect className="tag-selector" onMenuOpen={this.select_menuOpen} onMenuClose={this.select_menuClose} styles={styles.select} theme={styles.selectTheme} ref={this.answerInput_} value={this.state.answer} placeholder="" components={makeAnimated()} isMulti={true} isClearable={false} backspaceRemovesValue={true} options={this.props.autocomplete} onChange={onSelectChange} onKeyDown={(event: any) => onKeyDown(event)} />;
		} else if (this.props.inputType === 'dropdown') {
			inputComp = <Select className="item-selector" onMenuOpen={this.select_menuOpen} onMenuClose={this.select_menuClose} styles={styles.select} theme={styles.selectTheme} ref={this.answerInput_} components={makeAnimated()} value={this.props.answer} defaultValue={this.props.defaultValue} isClearable={false} options={this.props.autocomplete} onChange={onSelectChange} onKeyDown={(event: any) => onKeyDown(event)} />;
		} else {
			inputComp = <input style={styles.input} ref={this.answerInput_} value={this.state.answer} type="text" onChange={event => onChange(event)} onKeyDown={event => onKeyDown(event)} />;
		}

		const buttonComps = [];
		if (buttonTypes.indexOf('create') >= 0) {
			buttonComps.push(
				<button key="create" disabled={!this.state.answer} style={styles.button} onClick={() => onClose(true, 'create')}>
					{_('Create')}
				</button>
			);
		}
		if (buttonTypes.indexOf('ok') >= 0) {
			buttonComps.push(
				<button key="ok" disabled={!this.state.answer} style={styles.button} onClick={() => onClose(true, 'ok')}>
					{_('OK')}
				</button>
			);
		}
		if (buttonTypes.indexOf('cancel') >= 0) {
			buttonComps.push(
				<button key="cancel" style={styles.button} onClick={() => onClose(false, 'cancel')}>
					{_('Cancel')}
				</button>
			);
		}
		if (buttonTypes.indexOf('clear') >= 0) {
			buttonComps.push(
				<button key="clear" style={styles.button} onClick={() => onClose(false, 'clear')}>
					{_('Clear')}
				</button>
			);
		}

		return (
			<div className="modal-layer" style={styles.modalLayer}>
				<div className="modal-dialog" style={styles.promptDialog}>
					<label style={styles.label}>{this.props.label ? this.props.label : ''}</label>
					<div style={{ display: 'inline-block', color: 'black', backgroundColor: theme.backgroundColor }}>
						{inputComp}
						{descComp}
					</div>
					<div style={{ textAlign: 'right', marginTop: 10 }}>{buttonComps}</div>
				</div>
			</div>
		);
	}
}
