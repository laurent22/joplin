import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Button } from 'react-native';
import { _ } from 'src/locale.js';

class OfflineButtonComponent extends Component {

	render() {
		return <Button onPress={this.props.onPress} title={_(this.props.label)} />
	}

}

const OfflineButton = connect(
	(state) => {
		//return { label: state.myButtonLabel };
	},
	(dispatch) => {
		return {
			onPress: function() {
				dispatch({
					type: 'WORK_OFFLINE'
				});
			}
		}
	}
)(OfflineButtonComponent)

export { OfflineButton };