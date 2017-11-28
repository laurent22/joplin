const React = require('react');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const { time } = require('lib/time-utils.js');
const Datetime = require('react-datetime');

class PromptDialog extends React.Component {

	componentWillMount() {
		this.setState({
			visible: false,
			answer: this.props.value ? this.props.value : '',
		});
		this.focusInput_ = true;
	}

	componentWillReceiveProps(newProps) {
		if ('visible' in newProps) {
			this.setState({ visible: newProps.visible });
			if (newProps.visible) this.focusInput_ = true;
		}

		if ('value' in newProps) {
			this.setState({ answer: newProps.value });
		}
	}

	componentDidUpdate() {
		if (this.focusInput_ && this.answerInput_) this.answerInput_.focus();
		this.focusInput_ = false;
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const buttonTypes = this.props.buttons ? this.props.buttons : ['ok', 'cancel'];

		const modalLayerStyle = {
			zIndex: 9999,
			position: 'absolute',
			top: 0,
			left: 0,
			width: style.width,
			height: style.height,
			backgroundColor: 'rgba(0,0,0,0.6)',
			display: this.state.visible ? 'flex' : 'none',
    		alignItems: 'center',
    		justifyContent: 'center',
		};

		const promptDialogStyle = {
			backgroundColor: 'white',
			padding: 16,
			display: 'inline-block',
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
		};

		const buttonStyle = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
		};

		const labelStyle = {
			marginRight: 5,
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			verticalAlign: 'top',
		};

		const inputStyle = {
			width: 0.5 * style.width,
			maxWidth: 400,
		};

		const descStyle = Object.assign({}, theme.textStyle, {
			marginTop: 10,
		});

		const onClose = (accept, buttonType) => {
			if (this.props.onClose) this.props.onClose(accept ? this.state.answer : null, buttonType);
			this.setState({ visible: false, answer: '' });
		}

		const onChange = (event) => {
			this.setState({ answer: event.target.value });
		}

		const onDateTimeChange = (momentObject) => {
			this.setState({ answer: momentObject.toDate() });
		}

		const onKeyDown = (event) => {
			if (event.key === 'Enter') {
				onClose(true);
			} else if (event.key === 'Escape') {
				onClose(false);
			}
		}

		const descComp = this.props.description ? <div style={descStyle}>{this.props.description}</div> : null;

		let inputComp = null;

		if (this.props.inputType === 'datetime') {
			inputComp = <Datetime
				value={this.state.answer}
				dateFormat={time.dateFormat()}
				timeFormat={time.timeFormat()}
				onChange={(momentObject) => onDateTimeChange(momentObject)}
			/>
		} else {
			inputComp = <input
				style={inputStyle}
				ref={input => this.answerInput_ = input}
				value={this.state.answer}
				type="text"
				onChange={(event) => onChange(event)}
				onKeyDown={(event) => onKeyDown(event)}
			/>
		}

		const buttonComps = [];
		if (buttonTypes.indexOf('ok') >= 0) buttonComps.push(<button key="ok" style={buttonStyle} onClick={() => onClose(true, 'ok')}>{_('OK')}</button>);
		if (buttonTypes.indexOf('cancel') >= 0) buttonComps.push(<button key="cancel" style={buttonStyle} onClick={() => onClose(false, 'cancel')}>{_('Cancel')}</button>);
		if (buttonTypes.indexOf('clear') >= 0) buttonComps.push(<button key="clear" style={buttonStyle} onClick={() => onClose(false, 'clear')}>{_('Clear')}</button>);

		return (
			<div style={modalLayerStyle}>
				<div style={promptDialogStyle}>
					<label style={labelStyle}>{this.props.label ? this.props.label : ''}</label>
					<div style={{display: 'inline-block'}}>
						{inputComp}
						{descComp}
					</div>
					<div style={{ textAlign: 'right', marginTop: 10 }}>
						{buttonComps}
					</div>
				</div>
			</div>
		);
	}

}

module.exports = { PromptDialog };