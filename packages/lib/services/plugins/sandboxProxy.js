const handler = {};

handler.get = function(target, prop) {
	let t = target;

	// There's probably a cleaner way to do this but not sure how. The idea is to keep
	// track of the calling chain current state. So if the user call `joplin.something.test("bla")`
	// we know we need to pass "joplin.something.test" with args "bla" to the target.
	// But also, if the user does this:
	//
	// const ns = joplin.view.dialogs;
	// await ns.create();
	// await ns.open();
	//
	// We need to know what "ns" maps to, so that's why call-specific context needs to be kept,
	// and the easiest way to do this is to create a new target when the call chain starts,
	// and attach a custom "__joplinNamespace" property to it.
	if (!t.__joplinNamespace) {
		const originalTarget = t;
		const newTarget = (name, args) => {
			return originalTarget(name, args);
		};
		newTarget.__joplinNamespace = [prop];
		t = newTarget;
	} else {
		t.__joplinNamespace.push(prop);
	}

	return new Proxy(t, handler);
};

handler.apply = function(target, _thisArg, argumentsList) {
	const path = target.__joplinNamespace.join('.');
	target.__joplinNamespace.pop();
	return target(path, argumentsList);
};

module.exports = function sandboxProxy(target) {
	return new Proxy(target, handler);
};
