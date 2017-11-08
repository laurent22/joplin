const React = require('react');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');

class PromptDialog extends React.Component {

	componentWillMount() {
		this.setState({
			visible: false,
			answer: '',
		});
		this.focusInput_ = true;
	}

	componentWillReceiveProps(newProps) {
		if ('visible' in newProps) {
			this.setState({ visible: newProps.visible });
			if (newProps.visible) this.focusInput_ = true;
		}
	}

	componentDidUpdate() {
		if (this.focusInput_ && this.answerInput_) this.answerInput_.focus();
		this.focusInput_ = false;
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

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
			padding: 10,
			display: 'inline-block',
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
		};

		const buttonStyle = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
		};

		const inputStyle = {
			width: 0.5 * style.width,
			maxWidth: 400,
		};

		const onAccept = () => {
			if (this.props.onAccept) this.props.onAccept(this.state.answer);
			this.setState({ visible: false, answer: '' });
		}

		const onReject = () => {
			if (this.props.onReject) this.props.onReject();
			this.setState({ visible: false, answer: '' });
		}

		const onChange = (event) => {
			this.setState({ answer: event.target.value });
		}

		const onKeyDown = (event) => {
			if (event.key === 'Enter') {
				onAccept();
			} else if (event.key === 'Escape') {
				onReject();
			}
		}

		return (
			<div style={modalLayerStyle}>
				<div style={promptDialogStyle}>
					<label style={{ marginRight: 5 }}>{this.props.message ? this.props.message : ''}</label>
					<input
						style={inputStyle}
						ref={input => this.answerInput_ = input}
						value={this.state.answer}
						type="text"
						onChange={(event) => onChange(event)}
						onKeyDown={(event) => onKeyDown(event)} />
					<div style={{ textAlign: 'right', marginTop: 10 }}>
						<button style={buttonStyle} onClick={() => onAccept()}>OK</button>
						<button style={buttonStyle} onClick={() => onReject()}>Cancel</button>
					</div>
				</div>
			</div>
		);
	}

}

module.exports = { PromptDialog };