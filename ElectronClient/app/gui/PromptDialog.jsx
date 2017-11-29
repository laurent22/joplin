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
			answer: this.props.defaultValue ? this.props.defaultValue : '',
		});
		this.focusInput_ = true;
	}

	componentWillReceiveProps(newProps) {
		if ('visible' in newProps && newProps.visible !== this.props.visible) {
			this.setState({ visible: newProps.visible });
			if (newProps.visible) this.focusInput_ = true;
		}

		if ('defaultValue' in newProps && newProps.defaultValue !== this.props.defaultValue) {
			this.setState({ answer: newProps.defaultValue });
		}
	}

	componentDidUpdate() {
		if (this.focusInput_ && this.answerInput_) this.answerInput_.focus();
		this.focusInput_ = false;
	}

	styles(themeId, width, height, visible) {
		const styleKey = themeId + '_' + width + '_' + height + '_' + visible;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styleKey_ = styleKey;

		this.styles_ = {};

		this.styles_.modalLayer = {
			zIndex: 9999,
			position: 'absolute',
			top: 0,
			left: 0,
			width: width,
			height: height,
			backgroundColor: 'rgba(0,0,0,0.6)',
			display: visible ? 'flex' : 'none',
    		alignItems: 'center',
    		justifyContent: 'center',
		};

		this.styles_.promptDialog = {
			backgroundColor: 'white',
			padding: 16,
			display: 'inline-block',
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
		};

		this.styles_.button = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
		};

		this.styles_.label = {
			marginRight: 5,
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			verticalAlign: 'top',
		};

		this.styles_.input = {
			width: 0.5 * width,
			maxWidth: 400,
		};

		this.styles_.desc = Object.assign({}, theme.textStyle, {
			marginTop: 10,
		});

		return this.styles_;
	}

	// shouldComponentUpdate(nextProps, nextState) {
	// 	console.info(JSON.stringify(nextProps)+JSON.stringify(nextState));

	// 	console.info('NEXT PROPS ====================');
	// 	for (var n in nextProps) {
	// 		if (!nextProps.hasOwnProperty(n)) continue;
	// 		console.info(n + ' = ' + (nextProps[n] === this.props[n]));
	// 	}

	// 	console.info('NEXT STATE ====================');
	// 	for (var n in nextState) {
	// 		if (!nextState.hasOwnProperty(n)) continue;
	// 		console.info(n + ' = ' + (nextState[n] === this.state[n]));
	// 	}

	// 	return true;
	// }

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const buttonTypes = this.props.buttons ? this.props.buttons : ['ok', 'cancel'];

		const styles = this.styles(this.props.theme, style.width, style.height, this.state.visible);

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

		const descComp = this.props.description ? <div style={styles.desc}>{this.props.description}</div> : null;

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
				style={styles.input}
				ref={input => this.answerInput_ = input}
				value={this.state.answer}
				type="text"
				onChange={(event) => onChange(event)}
				onKeyDown={(event) => onKeyDown(event)}
			/>
		}

		const buttonComps = [];
		if (buttonTypes.indexOf('ok') >= 0) buttonComps.push(<button key="ok" style={styles.button} onClick={() => onClose(true, 'ok')}>{_('OK')}</button>);
		if (buttonTypes.indexOf('cancel') >= 0) buttonComps.push(<button key="cancel" style={styles.button} onClick={() => onClose(false, 'cancel')}>{_('Cancel')}</button>);
		if (buttonTypes.indexOf('clear') >= 0) buttonComps.push(<button key="clear" style={styles.button} onClick={() => onClose(false, 'clear')}>{_('Clear')}</button>);

		return (
			<div style={styles.modalLayer}>
				<div style={styles.promptDialog}>
					<label style={styles.label}>{this.props.label ? this.props.label : ''}</label>
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