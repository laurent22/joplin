import Color4 from './Color4';
import Stroke from './components/Stroke';
import Path from './geometry/Path';
import Rect2 from './geometry/Rect2';
import { RenderablePathSpec } from './rendering/AbstractRenderer';
import { ComponentAddedListener, ImageLoader, OnProgressListener } from './types';

type OnFinishListener = ()=> void;

// Size of a loaded image if no size is specified.
export const defaultSVGViewRect = new Rect2(0, 0, 500, 500);

export default class SVGLoader implements ImageLoader {
	private onAddComponent: ComponentAddedListener|null = null;
	private onProgress: OnProgressListener|null = null;
	private processedCount: number = 0;
	private totalToProcess: number = 0;
	private rootViewBox: SVGRect|null;

	private constructor(private source: SVGSVGElement, private onFinish?: OnFinishListener) {
	}

	private strokeDataFromElem(node: SVGPathElement): RenderablePathSpec[] {
		const result: RenderablePathSpec[] = [];
		const pathData = node.getAttribute('d') ?? '';
		let fillColor = Color4.black;
		try {
			fillColor = Color4.fromHex(node.getAttribute('fill'));
		} catch (e) {
			console.error('Unknown fill color,', node.getAttribute('fill'));
		}

		// Break the path into chunks at each moveTo ('M') command:
		const parts = pathData.split('M');
		let isFirst = true;
		for (const part of parts) {
			if (part !== '') {
				// We split the path by moveTo commands, so add the 'M' back in
				// if it was present.
				const current = !isFirst ? `M${part}` : part;
				const path = Path.fromString(current);
				const spec = path.toRenderable({ color: fillColor });
				result.push(spec);
			}

			isFirst = false;
		}

		return result;
	}

	// Adds a stroke with a single path
	private addPath(node: SVGPathElement) {
		const stroke = new Stroke(this.strokeDataFromElem(node));
		this.onAddComponent?.(stroke);
	}

	// TODO: Remove. This method migrates users from the older (and more verbose)
	// <group class=joplin-stroke>...</group> syntax.
	private addLegacyStroke(node: SVGGElement) {
		const parts: RenderablePathSpec[] = [];
		for (const child of node.children) {
			if (child.tagName !== 'path') {
				console.error(
					'Encountered a node that is not a stroke:', node, '\nChecking child', child
				);
				throw new Error('node is not a stroke!');
			}

			parts.push(...this.strokeDataFromElem(child as SVGPathElement));
		}

		const stroke = new Stroke(parts);
		this.onAddComponent?.(stroke);
	}

	private async visit(node: Element) {
		this.totalToProcess += node.childElementCount;

		const legacyStrokeGroupClass = 'joplin-stroke';
		switch (node.tagName.toLowerCase()) {
		case 'g':
			if (node.classList.contains(legacyStrokeGroupClass)) {
				this.addLegacyStroke(node as SVGGElement);
			}
			break;
		case 'path':
			this.addPath(node as SVGPathElement);
			break;
		case 'svg':
			this.rootViewBox ??= (node as SVGSVGElement).viewBox?.baseVal;
			break;
		default:
			console.warn('Unknown SVG element,', node, ', ignoring!');

			// TODO: Load into an UnknownObject element.
			return;
		}

		for (const child of node.children) {
			await this.visit(child);
		}

		this.processedCount ++;
		await this.onProgress?.(this.processedCount, this.totalToProcess);
	}

	public async start(
		onAddComponent: ComponentAddedListener, onProgress: OnProgressListener
	): Promise<Rect2> {
		this.onAddComponent = onAddComponent;
		this.onProgress = onProgress;

		// Estimate the number of tags to process.
		this.totalToProcess = this.source.childElementCount;
		this.processedCount = 0;

		this.rootViewBox = null;
		await this.visit(this.source);

		const viewBox = this.rootViewBox;
		let result = defaultSVGViewRect;

		if (viewBox) {
			result = new Rect2(viewBox.x, viewBox.y, viewBox.width, viewBox.height);
		}

		this.onFinish?.();
		return result;
	}

	// TODO: Handling unsafe data! Tripple-check that this is secure!
	public static fromString(text: string): SVGLoader {
		const sandbox = document.createElement('iframe');
		sandbox.src = 'about:blank';
		sandbox.setAttribute('sandbox', 'allow-same-origin');
		sandbox.setAttribute('csp', 'default-src \'about:blank\'');
		sandbox.style.display = 'none';

		// Required to access the frame's DOM. See https://stackoverflow.com/a/17777943/17055750
		document.body.appendChild(sandbox);

		if (!sandbox.hasAttribute('sandbox')) {
			sandbox.remove();
			throw new Error('SVG loading iframe is not sandboxed.');
		}

		// Try running JavaScript within the iframe
		const sandboxDoc = sandbox.contentWindow?.document ?? sandbox.contentDocument;
		sandboxDoc.open();
		sandboxDoc.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>SVG Loading Sandbox</title>
				</head>
				<body>
					<script>
						console.error('JavaScript should not be able to run here!');
						throw new Error(
							'The SVG sandbox is broken! Please double-check the sandboxing setting.'
						);
					</script>
				</body>
			</html>
		`);
		sandboxDoc.close();

		const svgElem = sandboxDoc.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);
		svgElem.innerHTML = text;

		return new SVGLoader(svgElem, () => {
			sandbox.remove();
		});
	}
}
