import * as React from 'react';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface Props {
	manifest: PluginManifest;
}

const styles = StyleSheet.create({
	versionText: {
		opacity: 0.8,
	},
	title: {
		// Prevents the title text from being clipped on Android
		verticalAlign: 'middle',
		fontWeight: 'bold',
	},
});

const PluginTitle: React.FC<Props> = props => {
	return <Text style={styles.title}>
		<Text variant='titleMedium'>{
			props.manifest.name
		}</Text>  <Text variant='bodySmall' style={styles.versionText}>v{
			props.manifest.version
		}</Text>
	</Text>;
};

export default PluginTitle;
