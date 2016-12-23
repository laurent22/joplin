import React from 'react';
import { render } from 'react-dom'
import { createStore } from 'redux';
import { Provider } from 'react-redux'
import RootFolderList from 'components/root-folder-list.jsx';
import NoteList from 'components/note-list.jsx';
import { reducer } from './reducer.jsx'

let defaultState = {
	'myButtonLabel': 'click',
	items: [
		{ id: 101, title: 'folder 1', type: 1, parent_id: 0 },
		{ id: 102, title: 'folder 2', type: 1, parent_id: 0 },
		{ id: 103, title: 'folder 3', type: 1, parent_id: 101 },
		{ id: 104, title: 'folder 4', type: 1, parent_id: 101 },
		{ id: 105, title: 'folder 5', type: 1, parent_id: 0 },
		{ id: 106, title: 'folder 6', type: 1, parent_id: 105 },
		{ id: 1, type: 2, parent_id: 101, title: 'one', body: '111 dsqfdsmlk mqkfkdq sfkl qlmskfqm' },
		{ id: 2, type: 2, parent_id: 101, title: 'two', body: '222 dsqfdsmlk mqkfkdq sfkl 222 qlmskfqm' },
		{ id: 3, type: 2, parent_id: 103, title: 'three', body: '33 dsqfdsmlk mqkfkdq sfkl 33 qlmskfqm' },
		{ id: 4, type: 2, parent_id: 103, title: 'four', body: '4222 dsqfdsmlk mqkfkdq sfkl 222 qlmskfqm' },
		{ id: 5, type: 2, parent_id: 103, title: 'five', body: '5222 dsqfdsmlk mqkfkdq sfkl 222 qlmskfqm' },
		{ id: 6, type: 2, parent_id: 104, title: 'six', body: '6222 dsqfdsmlk mqkfkdq sfkl 222 qlmskfqm' },
		{ id: 7, type: 2, parent_id: 104, title: 'seven', body: '7222 dsqfdsmlk mqkfkdq sfkl 222 qlmskfqm' },
	],
	selectedFolderId: null,
	selectedNoteId: null,
	expandedFolderIds: [],
}

let store = createStore(reducer, defaultState)

class App extends React.Component {

	render() {
		return (
			<div>
				<RootFolderList />
				<NoteList />
			</div>
		)
	}

}

render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('container')
)


// var defaultState = {
// 	folders: [],
// 	todo: {
// 		items: []
// 	},
// 	selectedFolderId: null
// };

// function addTodo(message) {
// 	return {
// 		type: 'ADD_TODO',
// 		message: message,
// 		completed: false
// 	};
// }

// function completeTodo(index) {
// 	return {
// 		type: 'COMPLETE_TODO',
// 		index: index
// 	};
// }

// function deleteTodo(index) {
// 	return {
// 		type: 'DELETE_TODO',
// 		index: index
// 	};
// }

// function clearTodo() {
// 	return {
// 		type: 'CLEAR_TODO'
// 	};
// }

// function createId() {
// 	return Math.round(Math.random() * 99999);
// }

// function folderIndex(state, id) {
// 	for (var i = 0; i < state.folders.length; i++) {
// 		if (state.folders[i].id == id) return i;
// 	}
// 	return -1;
// }

// function folderById(state, id) {
// 	var i = folderIndex(state, id);
// 	return i >= 0 ? state.folders[i] : null;
// }

// function todoApp(state, action) {

// 	switch (action.type) {

// 		case 'ADD_FOLDER':

// 			var folder = {
// 				name: action.name,
// 				id: createId(),
// 				selected: false
// 			};

// 			state = immutable.push(state, 'folders', folder);
// 			state = immutable.set(state, 'selectedFolderId', folder.id);
// 			return state;

// 		case 'DELETE_FOLDER':

// 			var folders = deepcopy(state.folders);
// 			var index = folderIndex(state, action.id);
// 			if (index < 0) return state;
// 			folders.splice(index, 1);
// 			return immutable.set(state, 'folders', folders);

// 		case 'SET_SELECTED_FOLDER':

// 			return immutable.set(state, 'selectedFolderId', action.id);

// 		case 'SET_FOLDER_NAME':

// 			var idx = folderIndex(state, action.id);
// 			return immutable.set(state, 'folders.' + idx + '.name', action.name);

// 		case 'ADD_TODO':
// 			var items = [].concat(state.todo.items);
// 			return Object.assign({}, state, {
// 				todo: {
// 					items: items.concat([{
// 						message: action.message,
// 						completed: false
// 					}])
// 				}
// 			});

// 		case 'COMPLETE_TODO':
// 			var items = [].concat(state.todo.items);

// 			items[action.index].completed = true;

// 			return Object.assign({}, state, {
// 				todo: {
// 					items: items
// 				}
// 			});

// 		case 'DELETE_TODO':
// 			var items = [].concat(state.todo.items);

// 			items.splice(action.index, 1);

// 			return Object.assign({}, state, {
// 				todo: {
// 					items: items
// 				}
// 			});

// 		case 'CLEAR_TODO':
// 			return Object.assign({}, state, {
// 				todo: {
// 					items: []
// 				}
// 			});

// 		default:
// 			return state;
// 	}
// }

// var store = createStore(todoApp, defaultState);

// class AddTodoForm extends React.Component {
// 	state = {
// 		message: ''
// 	};

// 	onFormSubmit(e) {
// 		e.preventDefault();
// 		store.dispatch(addTodo(this.state.message));
// 		this.setState({ message: '' });
// 	}

// 	onMessageChanged(e) {
// 		var message = e.target.value;
// 		this.setState({ message: message });
// 	}

// 	render() {
// 		return (
// 			<form onSubmit={this.onFormSubmit.bind(this)}>
// 				<input type="text" placeholder="Todo..." onChange={this.onMessageChanged.bind(this)} value={this.state.message} />
// 				<input type="submit" value="Add" />
// 			</form>
// 		);
// 	}
// }

// class AddFolderForm extends React.Component {
// 	state = {
// 		name: ''
// 	};

// 	onFormSubmit(e) {
// 		e.preventDefault();
// 		store.dispatch({
// 			type: 'ADD_FOLDER',
// 			name: this.state.name
// 		});
// 		this.setState({ name: '' });
// 	}

// 	onInputChange(e) {
// 		this.setState({ name: e.target.value });
// 	}

// 	render() {
// 		return (
// 			<form onSubmit={this.onFormSubmit.bind(this)}>
// 				<input type="text" placeholder="Folder..." onChange={this.onInputChange.bind(this)} value={this.state.name} />
// 				<input type="submit" value="Add" />
// 			</form>
// 		);
// 	}
// }

// class TodoItem extends React.Component {
// 	onDeleteClick() {
// 		store.dispatch(deleteTodo(this.props.index));
// 	}

// 	onCompletedClick() {
// 		store.dispatch(completeTodo(this.props.index));
// 	}

// 	render() {
// 		return (
// 			<li>
// 				<a href="#" onClick={this.onCompletedClick.bind(this)} style={{textDecoration: this.props.completed ? 'line-through' : 'none'}}>{this.props.message.trim()}</a>&nbsp;
// 				<a href="#" onClick={this.onDeleteClick.bind(this)} style={{textDecoration: 'none'}}>[x]</a>
// 			</li>
// 		);
// 	}
// }

// class FolderItem extends React.Component {
// 	onDeleteClick() {
// 		store.dispatch({
// 			type: 'DELETE_FOLDER',
// 			id: this.props.item.id
// 		});
// 	}

// 	onSelected() {
// 		store.dispatch({
// 			type: 'SET_SELECTED_FOLDER',
// 			id: this.props.item.id
// 		});
// 	}

// 	render() {
// 		let selectedClass = this.props.selected ? 'selected' : '';
// 		return (
// 			<li>
// 				<a href="#" className={selectedClass} onClick={this.onSelected.bind(this)}>{this.props.item.name} ({this.props.item.id})</a> <a href="#" onClick={this.onDeleteClick.bind(this)}>[x]</a>
// 			</li>
// 		);
// 	}
// }

// class FolderList extends React.Component {
// 	state = {
// 		folders: [],
// 		selectedFolderId: null,
// 		folderName: '',
// 		lastSelectedFolderId: null
// 	};

// 	componentWillMount() {
// 		store.subscribe(() => {
// 			var state = store.getState();
// 			this.setState({
// 				folders: state.folders,
// 				selectedFolderId: state.selectedFolderId
// 			});
// 		});
// 	}

// 	folderNameInput_keyPress(e) {
// 		if (e.key == 'Enter') {
// 			console.info(this.state.folderName);
// 			store.dispatch({
// 				type: 'SET_FOLDER_NAME',
// 				name: this.state.folderName,
// 				id: this.state.selectedFolderId
// 			});
// 		}
// 	}

// 	folderNameInput_onChange(e) {
// 		this.setState({ folderName: e.target.value });
// 	}

// 	render() {
// 		var items = [];

// 		this.state.folders.forEach((item, index) => {
// 			let isSelected = this.state.selectedFolderId == item.id;
// 			items.push(
// 				<FolderItem
// 					key={index}
// 					index={index}
// 					item={item}
// 					selected={isSelected} />
// 			);
// 		});

// 		if (!items.length) {
// 			return (
// 				<p>
// 					<i>No folder.</i>
// 				</p>
// 			);
// 		}

// 		var selectedFolder = folderById(this.state, this.state.selectedFolderId);
// 		var selectedFolderId = selectedFolder ? selectedFolder.id : null;
// 		if (selectedFolderId !== this.state.lastSelectedFolderId) {
// 			this.state.folderName = selectedFolder ? selectedFolder.name : '';
// 			this.state.lastSelectedFolderId = selectedFolderId;
// 		}

// 		return (
// 			<div>
// 				<ol>{ items }</ol>
// 				<input type="text" onKeyPress={this.folderNameInput_keyPress.bind(this)} onChange={this.folderNameInput_onChange.bind(this)} value={this.state.folderName} />
// 			</div>
// 		);
// 	}
// }


// class TodoList extends React.Component {
// 	state = {
// 		items: []
// 	};

// 	componentWillMount() {
// 		store.subscribe(() => {
// 			var state = store.getState();
// 			this.setState({
// 				items: state.todo.items
// 			});
// 		});
// 	}

// 	render() {
// 		var items = [];

// 		this.state.items.forEach((item, index) => {
// 			items.push(<TodoItem
// 				key={index}
// 				index={index}
// 				message={item.message}
// 				completed={item.completed}
// 			/>);
// 		});

// 		if (!items.length) {
// 			return (
// 				<p>
// 					<i>Please add something to do.</i>
// 				</p>
// 			);
// 		}

// 		return (
// 			<ol>{ items }</ol>
// 		);
// 	}
// }

// ReactDOM.render(
// 	<div>
// 		<h1>Todo</h1>
// 		<AddTodoForm />
// 		<AddFolderForm />
// 		<FolderList />
// 		<TodoList />
// 	</div>,
// 	document.getElementById('container')
// );

// store.dispatch({
// 	type: 'ADD_FOLDER',
// 	name: 'aaaa'
// });

// store.dispatch({
// 	type: 'ADD_FOLDER',
// 	name: 'bbbb'
// });

// store.dispatch({
// 	type: 'ADD_FOLDER',
// 	name: 'cccc'
// });
