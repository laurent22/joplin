import * as React from 'react';
import { Icon, Card, Chip, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import ActionButton, { PluginCallback } from './ActionButton';
import PluginInfoButton from './PluginInfoButton';
import categoryColors from './categoryColors';

export enum InstallState {
	NotInstalled,
	Installing,
	Installed,
}

export enum UpdateState {
	Idle = 1,
	CanUpdate = 2,
	Updating = 3,
	HasBeenUpdated = 4,
}

interface Props {
	themeId: number;
	item: PluginItem;
	isCompatible: boolean;

	hasErrors?: boolean;
	installState?: InstallState;
	updateState?: UpdateState;

	onAboutPress?: PluginCallback;
	onInstall?: PluginCallback;
	onUpdate?: PluginCallback;
	onDelete?: PluginCallback;
	onToggle?: PluginCallback;
	onShowPluginLog?: PluginCallback;
}

const onRecommendedPress = () => {
	Alert.alert(
		'',
		_('The Joplin team has vetted this plugin and it meets our standards for security and performance.'),
		[
			{
				text: _('Learn more'),
				onPress: () => Linking.openURL('https://github.com/joplin/plugins/blob/master/readme/recommended.md'),
			},
			{
				text: _('OK'),
			},
		],
		{ cancelable: true },
	);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const PluginIcon = (props: any) => <Icon {...props} source='puzzle'/>;

const styles = StyleSheet.create({
	versionText: {
		opacity: 0.8,
	},
	title: {
		// Prevents the title text from being clipped on Android
		verticalAlign: 'middle',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		position: 'relative',
	},
	categoryBadgeContainer: {
		position: 'absolute',
		top: 10,
		right: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	categoryBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 15,
		marginLeft: 4,
	},
	categoryText: {
		color: 'white',
		fontWeight: 'bold',
	},
});

const PluginBox: React.FC<Props> = props => {
	const manifest = props.item.manifest;
	const item = props.item;

	const installButtonTitle = () => {
		if (props.installState === InstallState.Installing) return _('Installing...');
		if (props.installState === InstallState.NotInstalled) return _('Install');
		if (props.installState === InstallState.Installed) return _('Installed');
		return `Invalid install state: ${props.installState}`;
	};

	const installButton = (
		<ActionButton
			item={item}
			onPress={props.onInstall}
			disabled={props.installState !== InstallState.NotInstalled || !props.isCompatible}
			loading={props.installState === InstallState.Installing}
			title={installButtonTitle()}
		/>
	);

	const getUpdateButtonTitle = () => {
		if (props.updateState === UpdateState.Updating) return _('Updating...');
		if (props.updateState === UpdateState.HasBeenUpdated) return _('Updated');
		return _('Update');
	};

	const updateButton = (
		<ActionButton
			item={item}
			onPress={props.onUpdate}
			disabled={props.updateState !== UpdateState.CanUpdate || !props.isCompatible}
			loading={props.updateState === UpdateState.Updating}
			title={getUpdateButtonTitle()}
		/>
	);

	const deleteButton = (
		<ActionButton
			item={item}
			onPress={props.onDelete}
			disabled={props.item.deleted}
			title={props.item.deleted ? _('Deleted') : _('Delete')}
		/>
	);
	const disableButton = <ActionButton item={item} onPress={props.onToggle} title={_('Disable')}/>;
	const enableButton = <ActionButton item={item} onPress={props.onToggle} title={_('Enable')}/>;
	const aboutButton = <ActionButton item={item} onPress={props.onAboutPress} icon='web' title={_('About')}/>;

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<Chip
				icon='alert'
				mode='outlined'
				onPress={() => props.onShowPluginLog({ item })}
			>
				{_('Error')}
			</Chip>
		);
	};

	const renderRecommendedChip = () => {
		if (!props.item.manifest._recommended || !props.isCompatible) {
			return null;
		}
		return <Chip
			icon='crown'
			mode='outlined'
			onPress={onRecommendedPress}
		>
			{_('Recommended')}
		</Chip>;
	};

	const renderBuiltInChip = () => {
		if (!props.item.builtIn) {
			return null;
		}
		return <Chip icon='code-tags-check' mode='outlined'>{_('Built-in')}</Chip>;
	};

	const renderIncompatibleChip = () => {
		if (props.isCompatible) return null;
		return (
			<Chip
				icon='alert'
				mode='outlined'
				onPress={() => {
					void shim.showMessageBox(
						PluginService.instance().describeIncompatibility(props.item.manifest),
						{ buttons: [_('OK')] },
					);
				}}
			>{_('Incompatible')}</Chip>
		);
	};

	const renderRightEdgeButton = (buttonProps: { size: number }) => {
		// If .onAboutPress is given (e.g. when searching), there's another way to get information
		// about the plugin. In this case, we don't show the right-side information link.
		if (props.onAboutPress) return null;
		return (
			<View style={{ paddingTop: 25 }}>
				<PluginInfoButton {...buttonProps} themeId={props.themeId} item={props.item}/>
			</View>
		);
	};

	const updateStateIsIdle = props.updateState !== UpdateState.Idle;

	const titleComponent = <>
		<Text variant='titleMedium'>{manifest.name}</Text> <Text variant='bodySmall' style={styles.versionText}>v{manifest.version}</Text>
	</>;

	const renderCategoryBadge = () => {
		if (!manifest.categories || manifest.categories.length === 0) {
			return (
				<View style={styles.categoryBadgeContainer}>
					<View style={[styles.categoryBadge, { backgroundColor: categoryColors['other'] || 'gray' }]}>
						<Text style={styles.categoryText}>{_('Other')}</Text>
					</View>
				</View>
			);
		}

		const category = manifest.categories[0].toLowerCase();
		const backgroundColor = categoryColors[category] || 'gray';

		return (
			<View style={styles.categoryBadgeContainer}>
				<View style={[styles.categoryBadge, { backgroundColor }]}>
					<Text style={styles.categoryText}>{manifest.categories[0]}</Text>
				</View>
				{manifest.categories.length > 1 && (
					<View style={[styles.categoryBadge, { backgroundColor: 'gray' }]}>
						<Text style={styles.categoryText}>+</Text>
					</View>
				)}
			</View>
		);
	};

	return (
		<Card style={{ margin: 8, opacity: props.isCompatible ? undefined : 0.75 }} testID='plugin-card'>
			<View style={styles.cardHeader}>
				<Card.Title
					title={titleComponent}
					titleStyle={styles.title}
					subtitle={manifest.description}
					left={PluginIcon}
					right={renderRightEdgeButton}
				/>
				{renderCategoryBadge()}
			</View>
			<Card.Content>
				<View style={{ flexDirection: 'row' }}>
					{renderIncompatibleChip()}
					{renderErrorsChip()}
					{renderRecommendedChip()}
					{renderBuiltInChip()}
				</View>
			</Card.Content>
			<Card.Actions>
				{props.onAboutPress ? aboutButton : null}
				{props.onInstall ? installButton : null}
				{props.onDelete && !props.item.builtIn ? deleteButton : null}
				{props.onUpdate && updateStateIsIdle ? updateButton : null}
				{props.onToggle && props.item.enabled ? disableButton : null}
				{props.onToggle && !props.item.enabled ? enableButton : null}
			</Card.Actions>
		</Card>
	);
};

export default PluginBox;
