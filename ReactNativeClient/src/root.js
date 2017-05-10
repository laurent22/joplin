import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';
import { Log } from 'src/log.js'
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

	switch (action.type) {

		case 'Navigation/NAVIGATE':
		case 'Navigation/BACK':

			const nextStateNav = AppNavigator.router.getStateForAction(action, state.nav);
			if (!nextStateNav) return state;
			let newState = Object.assign({}, state);
			newState.nav = nextStateNav;
			return newState;

		case 'VIEW_NOTE':

			// TODO
		 	return state;

	}

	return state;
}

let store = createStore(reducer);

class NotesScreen extends React.Component {
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

class NoteScreen extends React.Component {
	static navigationOptions = {
		title: 'Note',
	};
	render() {
		const { navigate } = this.props.navigation;
		return (
			<View style={{flex: 1}}>
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} />
				<Button
					title="Save note"
					onPress={() =>
						navigate('Notes')
					}
				/>
			</View>
		);
	}
}

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