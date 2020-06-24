import produce, { Draft } from 'immer';

export const defaultState = {
	controls: {},
};

const reducer = produce((draft: Draft<any>, action:any) => {
	if (action.type.indexOf('PLUGIN_') !== 0) return;

	if (!action.pluginId) throw new Error(`action.pluginId is required. Action was: ${JSON.stringify(action)}`);

	try {
		switch (action.type) {

		case 'PLUGIN_ADD':

			draft.plugins[action.pluginId] = {
				controls: {},
			};
			break;

		case 'PLUGIN_CONTROL_ADD':

			draft.plugins[action.pluginId].controls[action.control.id] = { ...action.control };
			break;

		case 'PLUGIN_CONTROL_PROP_SET':

			draft.plugins[action.pluginId].controls[action.id][action.name] = action.value;
			// newControls[action.controlId] = newControl;
			// newState.controls = newControls;



			// const newControl = newControls.control[action.controlId] ? {...newControls.control[action.controlId]}
			// //if (!newControls[action.controlId]) newControls[action.controlId] = {};
			// newControls[action.controlId][action.name] = action.value;
			// newState.controls = newControls;

			// console.info('BBBBBBBBBBBBBBBBBBBBBBBBBB', newState);
			break;

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	// TODO: DISABLE FREEZING IN PROD
});

export default reducer;

// export default produce(function reducer(state, action) {
// 	let newState = state.plugins;

// 	try {
// 		switch (action.type) {

// 		case 'PLUGIN_CONTROL_ADD':

// 			newState = {...state}
// 			const newControls = { ...newState.controls };
// 			newControls[action.control.id] = {...action.control};
// 			newState.controls = newControls;
// 			break;

// 		case 'PLUGIN_CONTROL_PROP_SET':

// 			newState = { ...state };
// 			const newControls = { ...newState.controls };
// 			2.c
// 			onst newControl = { ...newControls[action.controlId] };
// 			newControl[action.name] = action.value;

// 			// newControls[action.controlId] = newControl;
// 			// newState.controls = newControls;



// 			// const newControl = newControls.control[action.controlId] ? {...newControls.control[action.controlId]}
// 			// //if (!newControls[action.controlId]) newControls[action.controlId] = {};
// 			// newControls[action.controlId][action.name] = action.value;
// 			// newState.controls = newControls;

// 			// console.info('BBBBBBBBBBBBBBBBBBBBBBBBBB', newState);
// 			break;

// 		}
// 	} catch (error) {
// 		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
// 		throw error;
// 	}

// 	return newState !== state.plugins ? { ...state, plugins: newState } : state;
// }
