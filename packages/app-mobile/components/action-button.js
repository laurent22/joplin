const React = require('react');

const { StyleSheet } = require('react-native');
const Note = require('@joplin/lib/models/Note').default;
const Icon = require('react-native-vector-icons/Ionicons').default;
const ReactNativeActionButton = require('react-native-action-button').default;
const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465
Icon.loadFont().catch((error) => { console.info(error); });

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

		this.renderIconMultiStates = this.renderIconMultiStates.bind(this);
		this.renderIcon = this.renderIcon.bind(this);
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if ('buttonIndex' in newProps) {
			this.setState({ buttonIndex: newProps.buttonIndex });
		}
	}

	async newNoteNavigate(folderId, isTodo) {
		const newNote = await Note.save({
			parent_id: folderId,
			is_todo: isTodo ? 1 : 0,
		}, { provisional: true });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: newNote.id,
		});
	}

	newTodo_press() {
		this.newNoteNavigate(this.props.parentFolderId, true);
	}

	newNote_press() {
		this.newNoteNavigate(this.props.parentFolderId, false);
	}

	renderIconMultiStates() {
		const button = this.props.buttons[this.state.buttonIndex];

		return <Icon
			name={button.icon}
			style={styles.actionButtonIcon}
			accessibilityLabel={button.title}
		/>;
	}

	renderIcon() {
		const mainButton = this.props.mainButton ? this.props.mainButton : {};
		const iconName = mainButton.icon ?? 'md-add';

		// Icons don't have alt text by default. We need to add it:
		const iconTitle = mainButton.title ?? _('Add new');

		// TODO: If the button toggles a sub-menu, state whether the submenu is open
		//    or closed.

		return (
			<Icon
				name={iconName}
				style={styles.actionButtonIcon}
				accessibilityLabel={iconTitle}
			/>
		);
	}

	render() {
		const buttons = this.props.buttons ? this.props.buttons : [];

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

		const buttonComps = [];
		for (let i = 0; i < buttons.length; i++) {
			const button = buttons[i];
			const buttonTitle = button.title ? button.title : '';
			const key = `${buttonTitle.replace(/\s/g, '_')}_${button.icon}`;
			buttonComps.push(
				// TODO: By default, ReactNativeActionButton also adds a title, which is focusable
				// by the screen reader. As such, each item currently is double-focusable
				<ReactNativeActionButton.Item key={key} buttonColor={button.color} title={buttonTitle} onPress={button.onPress}>
					<Icon
						name={button.icon}
						style={styles.actionButtonIcon}
						accessibilityLabel={buttonTitle}
					/>
				</ReactNativeActionButton.Item>
			);
		}

		if (!buttonComps.length && !this.props.mainButton) {
			return null;
		}

		if (this.props.multiStates) {
			if (!this.props.buttons || !this.props.buttons.length) throw new Error('Multi-state button requires at least one state');
			if (this.state.buttonIndex < 0 || this.state.buttonIndex >= this.props.buttons.length) throw new Error(`Button index out of bounds: ${this.state.buttonIndex}/${this.props.buttons.length}`);
			const button = this.props.buttons[this.state.buttonIndex];
			return (
				<ReactNativeActionButton
					renderIcon={this.renderIconMultiStates}
					buttonColor="rgba(231,76,60,1)"
					onPress={() => {
						button.onPress();
					}}
				/>
			);
		} else {
			const mainButtonPress = this.props.mainButtonPress ? this.props.mainButtonPress : () => {};
			const degrees = buttonComps.length ? 135 : 0;

			return (
				<ReactNativeActionButton textStyle={styles.itemText} renderIcon={this.renderIcon} buttonColor="rgba(231,76,60,1)" onPress={mainButtonPress} degrees={degrees}>
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
