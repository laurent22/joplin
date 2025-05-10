import { RefObject, useMemo, useRef } from 'react';
import { PostMessage } from '../types';
import useMessageHandler from './useMessageHandler';

type FormDataRecord = Record<string, unknown>;
type FormDataListener = (formData: FormDataRecord)=> void;

const useFormData = (viewRef: RefObject<HTMLIFrameElement>, postMessage: PostMessage) => {
	const formDataListenersRef = useRef<FormDataListener[]>([]);
	useMessageHandler(viewRef, (event) => {
		if (event.data.message === 'serializedForms') {
			const formData = event.data.formData;
			if (typeof formData !== 'object') {
				throw new Error('Invalid formData result.');
			}

			const listeners = [...formDataListenersRef.current];
			formDataListenersRef.current = [];
			for (const listener of listeners) {
				listener(formData);
			}
		}
	});

	return useMemo(() => {
		return {
			getFormData: () => {
				return new Promise<FormDataRecord>(resolve => {
					postMessage('serializeForms', null);
					formDataListenersRef.current.push((data) => {
						resolve(data);
					});
				});
			},
		};
	}, [postMessage]);
};

export default useFormData;
