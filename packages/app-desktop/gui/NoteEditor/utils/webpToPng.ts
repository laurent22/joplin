import * as fs from 'fs-extra';

export default async function webpToPng(filePath: string): Promise<Uint8Array> {
	const webp = await fs.readFile(filePath);
	const dataUrl = `data:image/webp;base64,${webp.toString('base64')}`;

	return new Promise((resolve, reject) => {
		const image = document.createElement('img');

		image.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;

			const context = canvas.getContext('2d');
			if (!context) {
				reject(new Error('Could not create a canvas context'));
				return;
			}

			context.drawImage(image, 0, 0);
			canvas.toBlob(async blob => {
				if (!blob) {
					reject(new Error('Could not convert WebP image to PNG'));
					return;
				}

				resolve(new Uint8Array(await blob.arrayBuffer()));
			}, 'image/png');
		};
		image.onerror = () => reject(new Error(`Could not load WebP image: ${filePath}`));
		image.src = dataUrl;
	});
}
