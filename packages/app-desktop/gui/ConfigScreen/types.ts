import { SettingsRecord } from '@joplin/lib/models/Setting';

export interface UpdateSettingValueEvent<Key extends string> {
	key: Key;
	value: SettingsRecord[Key];
}
export type OnUpdateSettingValue = <Key extends string> (event: UpdateSettingValueEvent<Key>)=> void;
