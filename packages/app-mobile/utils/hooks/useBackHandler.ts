import { useEffect } from 'react';
import BackButtonService from '../../services/BackButtonService';

type OnBackPress = ()=>(void|boolean);

const useBackHandler = (onBackPress: OnBackPress|null) => {
	useEffect(() => {
		if (!onBackPress) return () => {};

		const handler = () => {
			return !!(onBackPress() ?? true);
		};
		BackButtonService.addHandler(handler);
		return () => {
			BackButtonService.removeHandler(handler);
		};
	}, [onBackPress]);
};

export default useBackHandler;
