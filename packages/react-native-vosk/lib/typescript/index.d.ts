import { EmitterSubscription, EventSubscription } from 'react-native';
declare type VoskEvent = {
    /**
     * Event datas
     */
    data: string;
};
export default class Vosk {
    loadModel: (path: string) => any;
    currentRegisteredEvents: EmitterSubscription[];
    start: (grammar?: string[] | null) => Promise<String>;
    stop: () => void;
    stopOnly: () => void;
    cleanup: () => void;
    unload: () => void;
    onResult: (onResult: (e: VoskEvent) => void) => EventSubscription;
    onFinalResult: (onFinalResult: (e: VoskEvent) => void) => EventSubscription;
    onError: (onError: (e: VoskEvent) => void) => EventSubscription;
    onTimeout: (onTimeout: (e: VoskEvent) => void) => EventSubscription;
    private requestRecordPermission;
    private cleanListeners;
}
export {};
