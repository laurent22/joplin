import { useEffect, useRef } from 'react';
import BackButtonService from '../../services/BackButtonService';

type OnBackPress = ()=>(void|boolean);

const useBackHandler = (onBackPress: OnBackPress|null) => {
	const onBackPressRef = useRef(onBackPress);
	onBackPressRef.current = onBackPress ?? (() => {});
	const hasHandler = !!onBackPress;

	useEffect(() => {
		if (!hasHandler) return () => {};

		const handler = () => {
			return !!(onBackPressRef.current() ?? true);
		};
		BackButtonService.addHandler(handler);
		return () => {
			BackButtonService.removeHandler(handler);
		};
	}, [hasHandler]);
};

export default useBackHandler;
