export type Target = (name:string, args:any[]) => any;

const handler:any = {};

handler.namespace_ = [];

handler.get = function(target:Target, prop:string) {
	handler.namespace_.push(prop);
	return new Proxy(target, handler);
};

handler.apply = (target:Target, _thisArg:any, argumentsList:any[]) => {
	const path = handler.namespace_.join('.');
	handler.namespace_ = [];
	target(path, argumentsList);
};

export default function sandboxProxy(target:Target):any {
	return new Proxy(target, handler);
}
