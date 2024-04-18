const React = require('react');
const Component = React.Component;
const { View, TouchableHighlight } = require('react-native');
const Icon = require('react-native-vector-icons/Ionicons').default;

const styles = {
	checkboxIcon: {
		fontSize: 20,
		height: 22,
		// marginRight: 10,
	},
};

class Checkbox extends Component {
	constructor() {
		super();
		this.state = {
			checked: false,
		};
	}

	UNSAFE_componentWillMount() {
		this.setState({ checked: this.props.checked });
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if ('checked' in newProps) {
			this.setState({ checked: newProps.checked });
		}
	}

	onPress() {
		const newChecked = !this.state.checked;
		this.setState({ checked: newChecked });
		if (this.props.onChange) this.props.onChange(newChecked);
	}

	render() {
		const iconName = this.state.checked ? 'checkbox-outline' : 'square-outline';

		const style = this.props.style ? { ...this.props.style } : {};
		style.justifyContent = 'center';
		style.alignItems = 'center';

		const checkboxIconStyle = { ...styles.checkboxIcon };
		if (style.color) checkboxIconStyle.color = style.color;

		if (style.paddingTop) checkboxIconStyle.marginTop = style.paddingTop;
		if (style.paddingBottom) checkboxIconStyle.marginBottom = style.paddingBottom;
		if (style.paddingLeft) checkboxIconStyle.marginLeft = style.paddingLeft;
		if (style.paddingRight) checkboxIconStyle.marginRight = style.paddingRight;

		const thStyle = {
			justifyContent: 'center',
			alignItems: 'center',
		};

		if (style && style.display === 'none') return <View />;

		// if (style.display) thStyle.display = style.display;

		return (
			<TouchableHighlight
				onPress={() => this.onPress()}
				style={thStyle}
				accessibilityRole="checkbox"
				accessibilityState={{
					checked: this.state.checked,
				}}
				accessibilityLabel={this.props.accessibilityLabel ?? ''}>
				<Icon name={iconName} style={checkboxIconStyle} />
			</TouchableHighlight>
		);
	}
}

module.exports = { Checkbox };
