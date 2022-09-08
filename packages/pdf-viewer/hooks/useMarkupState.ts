import { useReducer } from 'react';
import { MarkupAction, MarkupActionType, MarkupState, MarkupTool, MarkupColor } from '../types';


const initialState: MarkupState = {
	isEnabled: false,
	currentTool: MarkupTool.Highlight,
	color: MarkupColor.Yellow,
};

function reducer(state: MarkupState, action: MarkupAction) {
	switch (action.type) {
	case MarkupActionType.Toggle:
		return { ...state, isEnabled: !state.isEnabled };
	case MarkupActionType.Tool:
		return { ...state, currentTool: action.value, isEnabled: true };
	case MarkupActionType.Color:
		return { ...state, color: action.value, isEnabled: true };
	default:
		throw new Error();
	}
}

const useMarkupState = () => {
	return useReducer(reducer, initialState);
};

export default useMarkupState;
