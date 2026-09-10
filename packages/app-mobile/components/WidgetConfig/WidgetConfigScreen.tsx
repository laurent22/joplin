import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { NativeModules, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, PaperProvider, useTheme } from 'react-native-paper';

import Icon from '../Icon';
import { quickActionDefs, defForType } from './quickActions';
import { QuickActionType } from './types';

const JoplinWidget = NativeModules.JoplinWidget;

interface ConfigInfo {
	appWidgetId: number;
	items: { type: QuickActionType; title: string }[] | null;
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		padding: 16,
	},
	title: {
		fontSize: 20,
		marginBottom: 16,
	},
	sectionLabel: {
		fontSize: 14,
		marginBottom: 8,
	},
	selectedRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 24,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 6,
	},
	chipText: {
		fontSize: 14,
	},
	actionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		gap: 12,
	},
	actionTitle: {
		fontSize: 16,
	},
	actions: {
		marginBottom: 24,
	},
	buttons: {
		flexDirection: 'row',
		gap: 12,
	},
});

const ConfigScreenContent: React.FC = () => {
	const [selected, setSelected] = useState<QuickActionType[]>([]);
	const [appWidgetId, setAppWidgetId] = useState(-1);
	const theme = useTheme();

	useEffect(() => {
		const loadConfig = async () => {
			try {
				const info: ConfigInfo = await JoplinWidget.getConfigInfo();
				setAppWidgetId(info.appWidgetId);
				if (info.items) setSelected(info.items.map(item => item.type));
			} catch (error) {
				console.error('Failed to load widget config', error);
			}
		};
		void loadConfig();
	}, []);

	const addAction = useCallback((type: QuickActionType) => {
		setSelected(current => current.includes(type) ? current : [...current, type]);
	}, []);

	const removeAction = useCallback((type: QuickActionType) => {
		setSelected(current => current.filter(t => t !== type));
	}, []);

	const save = useCallback(async () => {
		const items = selected.map(type => ({ type, title: defForType(type).title() }));
		await JoplinWidget.saveConfig(appWidgetId, items);
	}, [selected, appWidgetId]);

	const cancel = useCallback(async () => {
		await JoplinWidget.cancelConfig();
	}, []);

	return (
		<ScrollView style={styles.root}>
			<Text style={[styles.title, { color: theme.colors.onSurface }]}>Joplin widget</Text>

			<Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Selected actions (tap to remove)</Text>
			<View style={styles.selectedRow}>
				{selected.map((type, index) => {
					const def = defForType(type);
					return (
						<TouchableOpacity
							key={type}
							testID={`selected-${type}`}
							onPress={() => removeAction(type)}
							style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
						>
							<Text style={styles.chipText}>{index + 1}.</Text>
							<Icon name={def.icon} style={styles.chipText} accessibilityLabel={null} />
							<Text style={[styles.chipText, { color: theme.colors.onSurface }]}>{def.title()}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Available actions (tap to add)</Text>
			<View style={styles.actions}>
				{quickActionDefs.map(def => {
					const isSelected = selected.includes(def.type);
					return (
						<TouchableOpacity
							key={def.type}
							testID={`available-${def.type}`}
							onPress={() => addAction(def.type)}
							disabled={isSelected}
							style={styles.actionRow}
						>
							<Icon name={def.icon} style={styles.actionTitle} accessibilityLabel={null} />
							<Text style={[styles.actionTitle, { color: isSelected ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }]}>{def.title()}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<View style={styles.buttons}>
				<Button testID='save-button' mode='contained' disabled={selected.length === 0} onPress={save}>Save</Button>
				<Button testID='cancel-button' mode='outlined' onPress={cancel}>Cancel</Button>
			</View>
		</ScrollView>
	);
};

const WidgetConfigScreen: React.FC = () => {
	return (
		<PaperProvider>
			<ConfigScreenContent />
		</PaperProvider>
	);
};

export default WidgetConfigScreen;
