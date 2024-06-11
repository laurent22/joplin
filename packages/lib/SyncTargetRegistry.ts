import type BaseSyncTarget from './BaseSyncTarget';

export interface SyncTargetInfo {
	id: number;
	name: string;
	label: string;
	supportsSelfHosted: boolean;
	supportsConfigCheck: boolean;
	supportsRecursiveLinkedNotes: boolean;
	supportsShare: boolean;
	description: string;
	classRef: typeof BaseSyncTarget;
}

export default class SyncTargetRegistry {

	private static reg_: Record<number, typeof BaseSyncTarget> = {};

	private static get reg() {
		return this.reg_;
	}

	public static classById(syncTargetId: number) {
		const info = SyncTargetRegistry.reg[syncTargetId];
		if (!info) throw new Error(`Invalid id: ${syncTargetId}`);
		return info;
	}

	public static infoByName(name: string): SyncTargetInfo {
		for (const [, SyncTargetClass] of Object.entries(this.reg)) {
			if (SyncTargetClass.targetName() === name) {
				const output: SyncTargetInfo = {
					id: SyncTargetClass.id(),
					name: SyncTargetClass.targetName(),
					label: SyncTargetClass.label(),
					classRef: SyncTargetClass,
					description: SyncTargetClass.description(),
					supportsSelfHosted: SyncTargetClass.supportsSelfHosted(),
					supportsConfigCheck: SyncTargetClass.supportsConfigCheck(),
					supportsRecursiveLinkedNotes: SyncTargetClass.supportsRecursiveLinkedNotes(),
					supportsShare: SyncTargetClass.supportsShare(),
				};
				return output;
			}
		}
		throw new Error(`Unknown name: ${name}`);
	}

	public static infoById(id: number): SyncTargetInfo {
		return this.infoByName(this.idToName(id));
	}

	public static addClass(SyncTargetClass: typeof BaseSyncTarget) {
		this.reg[SyncTargetClass.id()] = SyncTargetClass;
	}

	public static allIds() {
		return Object.keys(this.reg);
	}

	public static nameToId(name: string) {
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			if (this.reg[n].targetName() === name) return this.reg[n].id();
		}
		throw new Error(`Name not found: ${name}. Was the sync target registered?`);
	}

	public static idToMetadata(id: number) {
		return this.infoById(id);
	}

	public static idToName(id: number) {
		return this.reg[id].targetName();
	}

	public static idAndLabelPlainObject(os: string) {
		const output: Record<string, string> = {};
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			const info = this.infoById(this.reg[n].id());
			if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
				continue;
			}
			output[n] = info.label;
		}

		return output;
	}

	public static optionsOrder(): string[] {
		return [
			'0', // None
			'10', // Joplin Cloud
			'7', // Dropbox
			'3', // OneDrive
		];
	}

}
