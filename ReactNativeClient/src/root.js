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

		 case 'SET_BUTTON_NAME':

			var state = shallowcopy(state);
			state.myButtonLabel = action.name;
			return state;

		 case 'INC_COUNTER':

			var state = shallowcopy(state);
			state.counter++;
			return state;

		 case 'VIEW_NOTE':

		 	// let state = Object.assign({}, state);
		 	// state.selectedNoteId = action.id;
		 	return state;

			// 
			// state.counter++;
			// return state;

	}

	return state;
}

// const appReducer = combineReducers({
// 	reducer: reducer,
// });

let store = createStore(reducer);

class MyInput extends Component {

	render() {
		return <TextInput value={this.props.text} onChangeText={this.props.onChangeText} />
	}

}

const mapStateToInputProps = function(state) {
 return { text: state.defaultText }
}

const mapDispatchToInputProps = function(dispatch) {
 return {
	 onChangeText(text) {
		 dispatch({
			 type: 'SET_BUTTON_NAME',
			 name: text
		 });
	 }
 }
}

const MyConnectionInput = connect(
	mapStateToInputProps,
	mapDispatchToInputProps
)(MyInput)


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
				<MyConnectionInput/>
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
				<MyConnectionInput/>
			</View>
		);
	}
}


class ProfileScreen extends React.Component {
	static navigationOptions = {
		title: 'Profile',
	};
	render() {
		const { navigate } = this.props.navigation;
		return (
			<Button
				title="Go to main"
				onPress={() =>
					navigate('Notes')
				}
			/>
		);
	}
}


const AppNavigator = StackNavigator({
	Notes: {screen: NotesScreen},
	Note: {screen: NoteScreen},
	Profile: {screen: ProfileScreen},
});

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<AppNavigator />
			</Provider>
		);
	}
}




// const AppNavigator = StackNavigator({
// 	Main: {screen: MainScreen},
// 	Profile: {screen: ProfileScreen},
// });

// class AppComponent extends React.Component {
//   render() {
//     return (
//       <AppNavigator navigation={addNavigationHelpers({
//         dispatch: this.props.dispatch,
//         state: this.props.nav,
//       })} />
//     );
//   }
// }

// const navInitialState = AppNavigator.router.getStateForAction(AppNavigator.router.getActionForPathAndParams('Main'));

// const navReducer = (state = navInitialState, action) => {
// 	const nextState = AppNavigator.router.getStateForAction(action, state);
// 	return nextState || state;
// };

// const appReducer = combineReducers({
// 	nav: navReducer,
// });

// const mapStateToProps = (state) => ({
//   nav: state.nav
// });

// const App = connect(mapStateToProps)(AppComponent);

// const store = createStore(appReducer);

// class Root extends React.Component {
//   render() {
//     return (
//       <Provider store={store}>
//         <App />
//       </Provider>
//     );
//   }
// }

export { Root };