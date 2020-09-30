export default class BaseService {

	static logger_:any = null;
	protected instanceLogger_:any = null;

	logger() {
		if (this.instanceLogger_) return this.instanceLogger_;
		if (!BaseService.logger_) throw new Error('BaseService.logger_ not set!!');
		return BaseService.logger_;
	}

	setLogger(v:any) {
		this.instanceLogger_ = v;
	}
}
