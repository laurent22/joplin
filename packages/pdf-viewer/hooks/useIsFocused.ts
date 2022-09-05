import { useEffect, useState } from 'react';

const useIsFocused = () => {
	const [isFocused, setIsFocused] = useState(false);

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.data.type === 'blur') {
				setIsFocused(false);
			}
		};
		const onClick = (_event: MouseEvent) => {
			setIsFocused(true);
		};
		window.addEventListener('message', onMessage);
		document.addEventListener('click', onClick);
		return () => {
			window.removeEventListener('message', onMessage);
			document.removeEventListener('click', onClick);
		};
	}, []);

	return isFocused;
};

export default useIsFocused;
