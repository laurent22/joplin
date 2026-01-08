import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
	readonly transcribe: (audioData: string) => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeWhisperModule');
