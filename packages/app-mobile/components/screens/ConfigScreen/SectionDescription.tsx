import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { useMemo } from 'react';
import { Linking, ViewStyle } from 'react-native';
import { Banner, Icon, Text } from 'react-native-paper';

interface Props {
	title: string;
	description: string;
	helpLink: string|undefined;
}

const InformationIcon = (props: { size: number }) => <Icon {...props} source='information'/>;
const HelpIcon = (props: { size: number }) => <Icon {...props} source='help-circle'/>;

const style: ViewStyle = { marginBottom: 10 };

const PluginPageDescription: React.FC<Props> = props => {
	const bannerActions = useMemo(() => {
		if (!props.helpLink) return [];

		return [
			{
				label: _('Learn more'),
				icon: HelpIcon,
				onPress: () => Linking.openURL(props.helpLink),
			},
		];
	}, [props.helpLink]);
	return (
		<Banner
			visible={true}
			elevation={2}
			icon={InformationIcon}
			style={style}
			actions={bannerActions}
		>
			<Text variant='titleMedium'>
				{props.title}{'\n'}
			</Text>
			<Text>
				{props.description}
			</Text>
		</Banner>
	);
};
export default PluginPageDescription;
