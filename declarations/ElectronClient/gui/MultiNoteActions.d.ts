/// <reference types="react" />
import { PluginStates } from 'lib/services/plugins/reducer';
interface MultiNoteActionsProps {
    themeId: number;
    selectedNoteIds: string[];
    notes: any[];
    dispatch: Function;
    watchedNoteFiles: string[];
    plugins: PluginStates;
}
export default function MultiNoteActions(props: MultiNoteActionsProps): JSX.Element;
export {};
