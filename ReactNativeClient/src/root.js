import React, { Component } from 'react';
import { Button } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { Log } from 'src/log.js'
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';

class MainScreen extends React.Component {
  static navigationOptions = {
    title: 'Welcome',
  };
  render() {
    const { navigate } = this.props.navigation;
    return (
      <Button
        title="Go to Jane's profile"
        onPress={() =>
          navigate('Profile', { name: 'Jane' })
        }
      />
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
          navigate('Main')
        }
      />
    );
  }
}

const AppNavigator = StackNavigator({
	Main: {screen: MainScreen},
	Profile: {screen: ProfileScreen},
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

const navInitialState = AppNavigator.router.getStateForAction(AppNavigator.router.getActionForPathAndParams('Main'));

const navReducer = (state = navInitialState, action) => {
	const nextState = AppNavigator.router.getStateForAction(action, state);
	return nextState || state;
};

const appReducer = combineReducers({
	nav: navReducer,
});

const mapStateToProps = (state) => ({
  nav: state.nav
});

const App = connect(mapStateToProps)(AppComponent);

const store = createStore(appReducer);

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