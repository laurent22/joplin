const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { Text, TouchableOpacity, View, StyleSheet } = require('react-native');
const { TextInput } = require('react-native-paper');
const { themeStyle } = require('./global-style.js');
import { AppState } from '../utils/types';

interface State {
	text: string;
}

interface Props {
	isTodo: boolean;
	onHide: ()=> void;
	onSubmit: (text: string)=> void;
	themeId: number;
}

class QuickItemComponent extends Component<Props, State> {

	public constructor() {
		super();
		this.styles_ = {};
		this.state = {
			text: '',
		};
	}

	public styles() {
		const theme = themeStyle(this.props.themeId);

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles = {
			listItem: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				justifyContent: 'center',
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			hideButtonStyle: {
				fontSize: theme.fontSize,
				paddingTop: theme.itemMarginTop + 15,
				paddingLeft: 10,
			},
		};

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	public render() {
		const listItemStyle = this.styles().listItem;
		const listItemTextStyle = this.styles().listItemText;
		const hideButtonStyle = this.styles().hideButtonStyle;

		return (
			<View style={listItemStyle}>
				{
					<TextInput
						style={listItemTextStyle}
						value={this.state.text}
						onChangeText={(text: string) => this.setState(
							{
								...this.state,
								text: text,
							}
						)}
						onSubmitEditing={async (_event: any) => {
							await this.props.onSubmit(this.state.text);
							this.setState({
								...this.state,
								text: '',
							});
						}}
						placeholder={'Untitled'}
						blurOnSubmit={false}
						label={
							this.props.isTodo ?
								'New to-do' : 'New note'
						}
						autoFocus={true}
					/>
				}
				<TouchableOpacity
					onPress={this.props.onHide}
					style={hideButtonStyle}
				>
					<Text>Hide</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const QuickItem = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(QuickItemComponent);

export default QuickItem;
