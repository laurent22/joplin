import { useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { waitForElement } from '@joplin/lib/dom';

const useRootElement = (elementId: string) => {
	const [rootElement, setRootElement] = useState<HTMLDivElement>(null);

	useAsyncEffect(async (event) => {
		const element = await waitForElement(document, elementId, event);
		if (event.cancelled) return;
		setRootElement(element);
	}, [document, elementId]);

	return rootElement;
};

export default useRootElement;
