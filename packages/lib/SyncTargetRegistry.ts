export interface SyncTargetInfo {
	id: number;
	name: string;
	label: string;
	supportsSelfHosted: boolean;
	supportsConfigCheck: boolean;
	description: string;
	classRef: any;
}

// const syncTargetOrder = [
// 	'joplinCloud',
// 	'dropbox',
// 	'onedrive',
// ];

export default class SyncTargetRegistry {

	private static reg_: Record<number, SyncTargetInfo> = {};

	private static get reg() {
		// if (!this.reg_[0]) {
		// 	this.reg_[0] = {
		// 		id: 0,
		// 		name: SyncTargetNone.targetName(),
		// 		label: SyncTargetNone.label(),
		// 		classRef: SyncTargetNone,
		// 		description: SyncTargetNone.description(),
		// 		supportsSelfHosted: false,
		// 		supportsConfigCheck: false,
		// 	};
		// }

		return this.reg_;
	}

	public static classById(syncTargetId: number) {
		const info = SyncTargetRegistry.reg[syncTargetId];
		if (!info) throw new Error(`Invalid id: ${syncTargetId}`);
		return info.classRef;
	}

	public static infoByName(name: string): SyncTargetInfo {
		for (const [, info] of Object.entries(this.reg)) {
			if (info.name === name) return info;
		}
		throw new Error(`Unknown name: ${name}`);
	}

	public static addClass(SyncTargetClass: any) {
		this.reg[SyncTargetClass.id()] = {
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
		return Object.keys(this.reg);
	}

	public static nameToId(name: string) {
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			if (this.reg[n].name === name) return this.reg[n].id;
		}
		throw new Error(`Name not found: ${name}. Was the sync target registered?`);
	}

	public static idToMetadata(id: number) {
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			if (this.reg[n].id === id) return this.reg[n];
		}
		throw new Error(`ID not found: ${id}`);
	}

	public static idToName(id: number) {
		return this.idToMetadata(id).name;
	}

	public static idAndLabelPlainObject(os: string) {
		const output: Record<string, string> = {};
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			const info = this.reg[n];
			if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
				continue;
			}
			output[n] = info.label;
		}

		return output;

		// const sorted: Record<string, string> = {};
		// for (const o of syncTargetOrder) {
		// 	sorted[o] = output[o];
		// }

		// for (const [name, value] of Object.entries(output)) {
		// 	if (!sorted[name]) sorted[name] = value;
		// }

		// return sorted;
	}
}
