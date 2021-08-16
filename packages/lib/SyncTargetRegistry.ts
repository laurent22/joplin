export interface SyncTargetInfo {
	id: number;
	name: string;
	label: string;
	supportsSelfHosted: boolean;
	supportsConfigCheck: boolean;
	description: string;
	classRef: any;
}

export default class SyncTargetRegistry {

	private static reg_: Record<number, SyncTargetInfo> = {};

	public static classById(syncTargetId: number) {
		const info = SyncTargetRegistry.reg_[syncTargetId];
		if (!info) throw new Error(`Invalid id: ${syncTargetId}`);
		return info.classRef;
	}

	public static infoByName(name: string): SyncTargetInfo {
		for (const [, info] of Object.entries(this.reg_)) {
			if (info.name === name) return info;
		}
		throw new Error(`Unknown name: ${name}`);
	}

	public static addClass(SyncTargetClass: any) {
		this.reg_[SyncTargetClass.id()] = {
			id: SyncTargetClass.id(),
			name: SyncTargetClass.targetName(),
			label: SyncTargetClass.label(),
			classRef: SyncTargetClass,
			description: SyncTargetClass.description(),
			supportsSelfHosted: SyncTargetClass.supportsSelfHosted(),
			supportsConfigCheck: SyncTargetClass.supportsConfigCheck(),
		};
	}

	public static allIds() {
		return Object.keys(this.reg_);
	}

	public static nameToId(name: string) {
		for (const n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			if (this.reg_[n].name === name) return this.reg_[n].id;
		}
		throw new Error(`Name not found: ${name}. Was the sync target registered?`);
	}

	public static idToMetadata(id: number) {
		for (const n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			if (this.reg_[n].id === id) return this.reg_[n];
		}
		throw new Error(`ID not found: ${id}`);
	}

	public static idToName(id: number) {
		return this.idToMetadata(id).name;
	}

	public static idAndLabelPlainObject(os: string) {
		const output: Record<string, string> = {};
		for (const n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			const info = this.reg_[n];
			if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
				continue;
			}
			output[n] = info.label;
		}
		return output;
	}
}
