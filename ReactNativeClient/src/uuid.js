import createUuidV4 from 'uuid/v4';

const uuid = {

	create: function() {
		return createUuidV4().replace(/-/g, '');
	}

}

export { uuid };