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
	notes: [],
	selectedNoteId: null,
};

const reducer = (state = defaultState, action) => {
	Log.info('Reducer action', action);

	let newState = state;

	switch (action.type) {

		case 'Navigation/NAVIGATE':
		case 'Navigation/BACK':

			// If the current screen is already the requested screen, don't do anything
			const r = state.nav.routes;
			if (r.length && r[r.length - 1].routeName == action.routeName) {
				return state
			}

			const nextStateNav = AppNavigator.router.getStateForAction(action, state.nav);			
			Log.info('NEXT', nextStateNav);
			newState = Object.assign({}, state);
			if (nextStateNav) {
				newState.nav = nextStateNav;
			}

			if (action.noteId) {
				newState.selectedNoteId = action.noteId;				
			}

			break;

		// Replace all the notes with the provided array
		case 'NOTES_UPDATE_ALL':

			newState = Object.assign({}, state);
			newState.notes = action.notes;
			break;

		// Insert the note into the note list if it's new, or
		// update it within the note array if it already exists.
		case 'NOTES_UPDATE_ONE':

			let newNotes = state.notes.splice(0);
			let found = false;
			for (let i = 0; i < newNotes.length; i++) {
				let n = newNotes[i];
				if (n.id == action.note.id) {
					newNotes[i] = action.note;
					found = true;
					break;
				}
			}

			if (!found) newNotes.push(action.note);

			newState = Object.assign({}, state);
			newState.notes = newNotes;
			break;

	}

	return newState;
}

let store = createStore(reducer);

class NotesScreenComponent extends React.Component {
	
	static navigationOptions = {
		title: 'Notes',
	};

	createNoteButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
		});
	}

	render() {
		const { navigate } = this.props.navigation;
		return (
			<View style={{flex: 1}}>
				<ItemList style={{flex: 1}}/>
				<Button title="Create note" onPress={this.createNoteButton_press} />
			</View>
		);
	}
}

const NotesScreen = connect(
	(state) => {
		return {};
	}
)(NotesScreenComponent)

class NoteScreenComponent extends React.Component {
	
	static navigationOptions = {
		title: 'Note',
	};

	constructor() {
		super();
		this.state = { note: Note.newNote() }
	}

	componentWillMount() {
		this.setState({ note: this.props.note });
	}

	noteComponent_change = (propName, propValue) => {
		this.setState((prevState, props) => {
			let note = Object.assign({}, prevState.note);
			note[propName] = propValue;
			return { note: note }
		});
	}

	title_changeText = (text) => {
		this.noteComponent_change('title', text);
	}

	body_changeText = (text) => {
		this.noteComponent_change('body', text);
	}

	saveNoteButton_press = () => {
		Note.save(this.state.note).then((note) => {
			this.props.dispatch({
				type: 'NOTES_UPDATE_ONE',
				note: note,
			});
		}).catch((error) => {
			Log.warn('Cannot save note', error);
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<TextInput value={this.state.note.title} onChangeText={this.title_changeText} />
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} value={this.state.note.body} onChangeText={this.body_changeText} />
				<Button title="Save note" onPress={this.saveNoteButton_press} />
			</View>
		);
	}

}

const NoteScreen = connect(
	(state) => {
		return {
			note: state.selectedNoteId ? Note.noteById(state.notes, state.selectedNoteId) : Note.newNote(),
		};
	}
)(NoteScreenComponent)

const AppNavigator = StackNavigator({
	Notes: {screen: NotesScreen},
	Note: {screen: NoteScreen},
});

class AppComponent extends React.Component {

	componentDidMount() {
		Note.previews().then((notes) => {
			this.props.dispatch({
				type: 'NOTES_UPDATE_ALL',
				notes: notes,
			});
		}).catch((error) => {
			Log.warn('Cannot load notes', error);
		});
	}

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