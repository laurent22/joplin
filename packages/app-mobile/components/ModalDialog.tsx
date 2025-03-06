import * as React from 'react';
import { ReactNode } from 'react';
import { Text, View, StyleSheet, Button, TextStyle, ViewStyle } from 'react-native';
import { themeStyle } from './global-style';
import { _ } from '@joplin/lib/locale';

import Modal from './Modal';

interface Props {
	themeId: number;
	ContentComponent: ReactNode;

	buttonBarEnabled: boolean;
	title: string;
	onOkPress: ()=> void;
	onCancelPress: ()=> void;
}

interface State {

}

class ModalDialog extends React.Component<Props, State> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;

	public constructor(props: Props) {
		super(props);
		this.styles_ = {};
	}

	private styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles: Record<string, ViewStyle|TextStyle> = {
			modalContentWrapper: {
				flex: 1,
				flexDirection: 'column',
				backgroundColor: theme.backgroundColor,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				margin: 20,
				padding: 10,
				borderRadius: 5,
				elevation: 10,
			},
			modalContentWrapper2: {
				flex: 1,
			},
			title: { ...theme.normalText, borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				paddingBottom: 10,
				fontWeight: 'bold' },
			buttonRow: {
				flexDirection: 'row',
				borderTopWidth: 1,
				borderTopColor: theme.dividerColor,
				paddingTop: 10,
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	public override render() {
		const ContentComponent = this.props.ContentComponent;
		const buttonBarEnabled = this.props.buttonBarEnabled !== false;

		return (
			<Modal transparent={true} visible={true} onRequestClose={() => {}} containerStyle={this.styles().modalContentWrapper}>
				<Text style={this.styles().title}>{this.props.title}</Text>
				<View style={this.styles().modalContentWrapper2}>{ContentComponent}</View>
				<View style={this.styles().buttonRow}>
					<View style={{ flex: 1 }}>
						<Button disabled={!buttonBarEnabled} title={_('OK')} onPress={this.props.onOkPress}></Button>
					</View>
					<View style={{ flex: 1, marginLeft: 5 }}>
						<Button disabled={!buttonBarEnabled} title={_('Cancel')} onPress={this.props.onCancelPress}></Button>
					</View>
				</View>
			</Modal>
		);
	}
}

export default ModalDialog;
