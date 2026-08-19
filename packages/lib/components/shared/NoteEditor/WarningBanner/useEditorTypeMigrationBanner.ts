import { _ } from '../../../../locale';
import Setting from '../../../../models/Setting';
import shim from '../../../../shim';

interface Props {
	editorMigrationVersion: number;
	markdownEditorEnabled: boolean;
	inEditorRenderingEnabled: boolean;
}

const useEditorTypeMigrationBanner = ({ markdownEditorEnabled, inEditorRenderingEnabled, editorMigrationVersion }: Props) => {
	const React = shim.react();
	const enabled = markdownEditorEnabled && editorMigrationVersion < 1 && inEditorRenderingEnabled;

	return React.useMemo(() => {
		const onMigrationComplete = () => {
			Setting.setValue('editor.migration', 1);
		};

		return {
			enabled,
			label: _('Certain Markdown formatting is now rendered in the editor by default. For example, **bold** will appear as actual bold text. You can change this behaviour in the "Editor" section of Settings.'),
			disable: {
				label: _('Disable it'),
				onPress: () => {
					Setting.setValue('editor.inlineRendering', false);
					Setting.setValue('editor.imageRendering', false);
					onMigrationComplete();
				},
			},
			keepEnabled: {
				label: _('Keep it enabled'),
				onPress: async () => {
					onMigrationComplete();
				},
			},
		};
	}, [enabled]);
};

export default useEditorTypeMigrationBanner;
