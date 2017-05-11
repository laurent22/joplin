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

		// Replace all the notes with the provided array
		case 'NOTES_UPDATE_ALL':

			newState = Object.assign({}, state);
			newState.notes = action.notes;
			break;

		// Insert the note into the note list if it's new, or
		// update it if it already exists.
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
		// TODO: if state changes are asynchronous, how to be sure that, when
		// the button is presssed, this.state.note contains the actual note?
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