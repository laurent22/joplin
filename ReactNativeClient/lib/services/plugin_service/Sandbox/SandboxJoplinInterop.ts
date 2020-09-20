import InteropService from 'lib/services/interop/InteropService';
import { Module } from 'lib/services/interop/types';

export default class SandboxJoplinInterop {

	private interopService_:InteropService = null;

	private interopService():InteropService {
		if (this.interopService_) return this.interopService_;
		this.interopService_ = new InteropService();
		return this.interopService_;
	}

	registerModule(module:Module) {
		return this.interopService().registerModule(module);
	}

}
