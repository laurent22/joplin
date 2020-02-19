const React = require('react');

const { StyleSheet } = require('react-native');
const Icon = require('react-native-vector-icons/Ionicons').default;
const ReactNativeActionButton = require('react-native-action-button').default;
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');

Icon.loadFont();

const styles = StyleSheet.create({
	actionButtonIcon: {
		fontSize: 20,
		height: 22,
		color: 'white',
	},
	itemText: {
		// fontSize: 14, // Cannot currently set fontsize since the bow surrounding the label has a fixed size
	},
});

class ActionButtonComponent extends React.Component {
	constructor() {
		super();
		this.state = {
			buttonIndex: 0,
		};
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if ('buttonIndex' in newProps) {
			this.setState({ buttonIndex: newProps.buttonIndex });
		}
	}

	newTodo_press() {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: null,
			folderId: this.props.parentFolderId,
			itemType: 'todo',
		});
	}

	newNote_press() {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: null,
			folderId: this.props.parentFolderId,
			itemType: 'note',
		});
	}

	render() {
		let buttons = this.props.buttons ? this.props.buttons : [];

		if (this.props.addFolderNoteButtons) {
			if (this.props.folders.length) {
				buttons.push({
					title: _('New to-do'),
					onPress: () => {
						this.newTodo_press();
					},
					color: '#9b59b6',
					icon: 'md-checkbox-outline',
				});

				buttons.push({
					title: _('New note'),
					onPress: () => {
						this.newNote_press();
					},
					color: '#9b59b6',
					icon: 'md-document',
				});
			}
		}

		let buttonComps = [];
		for (let i = 0; i < buttons.length; i++) {
			let button = buttons[i];
			let buttonTitle = button.title ? button.title : '';
			let key = `${buttonTitle.replace(/\s/g, '_')}_${button.icon}`;
			buttonComps.push(
				<ReactNativeActionButton.Item key={key} buttonColor={button.color} title={buttonTitle} onPress={button.onPress}>
					<Icon name={button.icon} style={styles.actionButtonIcon} />
				</ReactNativeActionButton.Item>
			);
		}

		if (!buttonComps.length && !this.props.mainButton) {
			return <ReactNativeActionButton style={{ display: 'none' }} />;
		}

		let mainButton = this.props.mainButton ? this.props.mainButton : {};
		let mainIcon = mainButton.icon ? <Icon name={mainButton.icon} style={styles.actionButtonIcon} /> : <Icon name="md-add" style={styles.actionButtonIcon} />;

		if (this.props.multiStates) {
			if (!this.props.buttons || !this.props.buttons.length) throw new Error('Multi-state button requires at least one state');
			if (this.state.buttonIndex < 0 || this.state.buttonIndex >= this.props.buttons.length) throw new Error(`Button index out of bounds: ${this.state.buttonIndex}/${this.props.buttons.length}`);
			let button = this.props.buttons[this.state.buttonIndex];
			let mainIcon = <Icon name={button.icon} style={styles.actionButtonIcon} />;
			return (
				<ReactNativeActionButton
					icon={mainIcon}
					buttonColor="rgba(231,76,60,1)"
					onPress={() => {
						button.onPress();
					}}
				/>
			);
		} else {
			return (
				<ReactNativeActionButton textStyle={styles.itemText} icon={mainIcon} buttonColor="rgba(231,76,60,1)" onPress={function() {}}>
					{buttonComps}
				</ReactNativeActionButton>
			);
		}
	}
}

const ActionButton = connect(state => {
	return {
		folders: state.folders,
		locale: state.settings.locale,
	};
})(ActionButtonComponent);

module.exports = { ActionButton };
