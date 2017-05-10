import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';
import { Log } from 'src/log.js'
import { Note } from 'src/models/note.js'
import { ItemList } from 'src/components/item-list.js'

let defaultState = {
	defaultText: 'bla',
	notes: [
		{ id: 1, title: "hello", body: "just testing\nmultiple\nlines" },
		{ id: 2, title: "hello2", body: "2 just testing\nmultiple\nlines" },
		{ id: 3, title: "hello3", body: "3 just testing\nmultiple\nlines" },
		{ id: 4, title: "hello4", body: "4 just testing\nmultiple\nlines" },
	],
	selectedNoteId: null,
};

const reducer = (state = defaultState, action) => {
	Log.info('Reducer action', action);

	let newState = state;

	switch (action.type) {

		case 'Navigation/NAVIGATE':
		case 'Navigation/BACK':

			const nextStateNav = AppNavigator.router.getStateForAction(action, state.nav);			
			newState = Object.assign({}, state);
			if (nextStateNav) {
				newState.nav = nextStateNav;
			}

			if (action.noteId) {
				newState.selectedNoteId = action.noteId;				
			}

			break;

		case 'VIEW_NOTE':

			newState = Object.assign({}, state);

		 	break;

	}

	return newState;
}

let store = createStore(reducer);

class NotesScreenComponent extends React.Component {
	static navigationOptions = {
		title: 'Notes',
	};
	render() {
		const { navigate } = this.props.navigation;
		return (
			<View style={{flex: 1}}>
				<ItemList style={{flex: 1}}/>
				<Button
					title="Create note"
					onPress={() =>
						navigate('Note')
					}
				/>
			</View>
		);
	}
}

const NotesScreen = connect(
	(state) => {
		return {};
	},
	(dispatch) => {
		return {};
	}
)(NotesScreenComponent)

class NoteScreenComponent extends React.Component {
	static navigationOptions = {
		title: 'Note',
	};
	render() {
		let note = this.props.note;
		// <Button title="Save note" />
		return (
			<View style={{flex: 1}}>
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} value={note ? note.body : ''} />
			</View>
		);
	}
}

const NoteScreen = connect(
	(state) => {
		let selectedNote = state.selectedNoteId ? Note.noteById(state.notes, state.selectedNoteId) : null;
		return { note: selectedNote };
	},
	(dispatch) => {
		return {};
	}
)(NoteScreenComponent)

const AppNavigator = StackNavigator({
	Notes: {screen: NotesScreen},
	Note: {screen: NoteScreen},
});

class AppComponent extends React.Component {
  render() {
    return (
      <AppNavigator navigation={addNavigationHelpers({
        dispatch: this.props.dispatch,
        state: this.props.nav,
      })} />
    );
  }
}

defaultState.nav = AppNavigator.router.getStateForAction(AppNavigator.router.getActionForPathAndParams('Notes'));

const mapStateToProps = (state) => {
	return {
  		nav: state.nav
  	};
};

const App = connect(mapStateToProps)(AppComponent);

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}

export { Root };