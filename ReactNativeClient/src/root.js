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

	Log.info('DB LA', Note.db());

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

	constructor() {
		super();
		this.state = { note: Note.newNote() }
	}

	componentWillMount() {
		this.setState({ note: this.props.note });
	}

	noteComponent_onChange = (propName, propValue) => {
		this.setState((prevState, props) => {
			let note = Object.assign({}, prevState.note);
			note[propName] = propValue;
			return { note: note }
		});
	}

	title_onChangeText = (text) => {
		this.noteComponent_onChange('title', text);
	}

	body_onChangeText = (text) => {
		this.noteComponent_onChange('body', text);
	}

	render() {

		let onSaveButtonPress = () => {
			return this.props.onSaveButtonPress(this.state.note);
		}

		return (
			<View style={{flex: 1}}>
				<TextInput value={this.state.note.title} onChangeText={this.title_onChangeText} />
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} value={this.state.note.body} onChangeText={this.body_onChangeText} />
				<Button title="Save note" onPress={onSaveButtonPress} />
			</View>
		);
	}

}

const NoteScreen = connect(
	(state) => {
		return {
			note: state.selectedNoteId ? Note.noteById(state.notes, state.selectedNoteId) : Note.newNote(),
			onSaveButtonPress: (note) => {
				Log.info(note);
			}
		};
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