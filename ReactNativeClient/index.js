// const {main} = require('./main.js');

// main();


import {AppRegistry} from 'react-native';
const {Root} = require('./root.js');
// import App from './App';
// import {name as appName} from './app.json';

AppRegistry.registerComponent('Joplin', () => Root);
