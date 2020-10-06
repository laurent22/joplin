/// <reference types="react" />
export interface ShortcutRecorderProps {
    onSave: (event: {
        commandName: string;
        accelerator: string;
    }) => void;
    onReset: (event: {
        commandName: string;
    }) => void;
    onCancel: (event: {
        commandName: string;
    }) => void;
    onError: (event: {
        recorderError: Error;
    }) => void;
    initialAccelerator: string;
    commandName: string;
    themeId: number;
}
export declare const ShortcutRecorder: ({ onSave, onReset, onCancel, onError, initialAccelerator, commandName, themeId }: ShortcutRecorderProps) => JSX.Element;
