import React, { Component } from 'react';
import { StyleSheet, TouchableHighlight } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const styles = {
	checkboxIcon: {
		fontSize: 20,
		height: 22,
		marginRight: 10,
	},
};

class Checkbox extends Component {

	constructor() {
		super();
		this.state = {
			checked: false,
		}
	}

	componentWillMount() {
		this.state = { checked: this.props.checked };
	}

	componentWillReceiveProps(newProps) {
		if ('checked' in newProps) {
			this.setState({ checked: newProps.checked });
		}
	}

	onPress() {
		let newChecked = !this.state.checked;
		this.setState({ checked: newChecked });
		if (this.props.onChange) this.props.onChange(newChecked);
	}

	render() {
		const iconName = this.state.checked ? 'md-checkbox-outline' : 'md-square-outline';

		let style = this.props.style ? Object.assign({}, this.props.style) : {};
		style.justifyContent = 'center';
		style.alignItems = 'center';

		const checkboxIconStyle = Object.assign({}, styles.checkboxIcon);
		if (style.color) checkboxIconStyle.color = style.color;

		const thStyle = {
			justifyContent: 'center',
			alignItems: 'center',
		};

		if (style.display) thStyle.display = style.display;

		return (
			<TouchableHighlight onPress={() => this.onPress()} style={thStyle}>
				<Icon name={iconName} style={checkboxIconStyle}/>
			</TouchableHighlight>
		);
	}

}

export { Checkbox };