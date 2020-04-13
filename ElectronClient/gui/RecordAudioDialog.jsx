const React = require('react');
const { themeStyle } = require('../theme.js');
const record = require('./record.js');
const DialogButtonRow = require('./DialogButtonRow.min');

class RecordAudioDialog extends React.Component {

    constructor() {
        super();
        this.buttonRow_click = this.buttonRow_click.bind(this);
        this.okButton = React.createRef();
        this.state = {
			isRecording: false,
        };
    }
    buttonRow_click() {
        if (this.state.isRecording) {
            this.setState({ isRecording: false });
            record.stopRecording();
        } else {
            this.setState({ isRecording: true });
            record.startRecording();
        }
    }
	render() {
        const theme = themeStyle(this.props.theme);

		return (
			<div  style={theme.dialogModalLayer}>
                <div style={theme.dialogBox}>
                    <h3>Audio Recorder</h3>
					<DialogButtonRow theme={this.props.theme} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
                    <div id="controls">
                        <button id="recordButton">Record</button>
                        <button id="pauseButton" disabled>Pause</button>
                        <button id="stopButton" disabled>Stop</button>
                    </div>

                </div>
            </div>
		);
	}
}

module.exports = RecordAudioDialog;