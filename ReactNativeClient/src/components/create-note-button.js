// import React, { Component } from 'react';
// import { connect } from 'react-redux'
// import { Button } from 'react-native';
// import { _ } from 'src/locale.js';

// class CreateNoteButtonComponent extends Component {

// 	render() {
// 		return <Button onPress={this.props.onPress} title={_("Create note")} />
// 	}

// }

// const CreateNoteButton = connect(
// 	(state) => {
// 		return {
// 			selectedNoteId: selectedNoteId,
// 		};
// 	},
// 	(dispatch) => {
// 		return {
// 			onPress: function() {
// 				dispatch({
// 					type: 'VIEW_NOTE'
// 				});
// 			}
// 		}
// 	}
// )(CreateNoteButtonComponent)

// export { CreateNoteButton };