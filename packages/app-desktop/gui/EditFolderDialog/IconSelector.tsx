import { EmojiButton } from '@joeattardi/emoji-button';
import { useEffect, useState, useCallback, useRef } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { loadScript } from '../utils/loadScript';
import Button from '../Button/Button';
import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import bridge from '../../services/bridge';

export interface ChangeEvent {
	value: FolderIcon;
}

type ChangeHandler = (event: ChangeEvent)=> void;

interface Props {
	onChange: ChangeHandler;
	icon: FolderIcon | null;
	title: string;
}

export const IconSelector = (props: Props) => {
	const [emojiButtonClassReady, setEmojiButtonClassReady] = useState<boolean>(false);
	const [picker, setPicker] = useState<EmojiButton>();
	const buttonRef = useRef(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const loadScripts = async () => {
			// The emoji-button lib is annoying to load as it only comes as an
			// ES module. So we first need to load the lib, then load a loader
			// script, which will copy the class to the window object.

			await loadScript({
				id: 'emoji-button-lib',
				src: `${bridge().vendorDir()}/lib/@joeattardi/emoji-button/dist/index.js`,
				attrs: {
					type: 'module',
				},
			});

			if (event.cancelled) return;

			await loadScript({
				id: 'emoji-button-lib-loader',
				src: `${bridge().vendorDir()}/loadEmojiLib.js`,
				attrs: {
					type: 'module',
				},
			});

			if (event.cancelled) return;

			setEmojiButtonClassReady(true);
		};

		void loadScripts();
	}, []);

	useEffect(() => {
		if (!emojiButtonClassReady) return () => {};

		const p: EmojiButton = new (window as any).EmojiButton({
			zIndex: 10000,
		});

		const onEmoji = (selection: FolderIcon) => {
			props.onChange({ value: { ...selection, type: FolderIconType.Emoji } });
		};

		p.on('emoji', onEmoji);

		setPicker(p);

		return () => {
			p.off('emoji', onEmoji);
		};
	}, [emojiButtonClassReady, props.onChange]);

	const onClick = useCallback(() => {
		picker.togglePicker(buttonRef.current);
	}, [picker]);

	// const buttonText = props.icon ? props.icon.emoji : '...';

	return (
		<Button
			disabled={!picker}
			ref={buttonRef}
			onClick={onClick}
			title={props.title}
		/>
	);

	// return (
	// 	<Button
	// 		disabled={!picker}
	// 		ref={buttonRef}
	// 		onClick={onClick}
	// 		title={buttonText}
	// 		isSquare={true}
	// 		fontSize={20}
	// 	/>
	// );
};
