import Color4 from './Color4';
import Stroke from './components/Stroke';
import Path from './geometry/Path';
import Rect2 from './geometry/Rect2';
import { RenderablePathSpec } from './rendering/AbstractRenderer';
import { strokeGroupClass } from './rendering/SVGRenderer';
import { ComponentAddedListener, ImageLoader } from './types';

type OnFinishListener = ()=> void;

// Size of a loaded image if no size is specified.
export const defaultSVGViewRect = new Rect2(0, 0, 500, 500);

export default class SVGLoader implements ImageLoader {
	private onAddComponent: ComponentAddedListener|null = null;
	private rootViewBox: SVGRect|null;

	private constructor(private source: SVGSVGElement, private onFinish?: OnFinishListener) {
	}

	private pathFromElem(node: SVGPathElement): RenderablePathSpec {
		const path = Path.fromString(node.getAttribute('d') ?? '');
		let fillColor = Color4.black;
		try {
			fillColor = Color4.fromHex(node.getAttribute('fill'));
		} catch (e) {
			console.error('Unknown fill color,', node.getAttribute('fill'));
		}
		const spec = path.toRenderable({ color: fillColor });
		return spec;
	}

	// Adds a stroke with a single path
	private addPath(node: SVGPathElement) {
		const stroke = new Stroke([this.pathFromElem(node)]);
		this.onAddComponent?.(stroke);
	}

	private addStroke(node: SVGGElement) {
		const parts: RenderablePathSpec[] = [];
		for (const child of node.children) {
			if (child.tagName !== 'path') {
				console.error(
					'Encountered a node that is not a stroke:', node, '\nChecking child', child
				);
				throw new Error('node is not a stroke!');
			}

			parts.push(this.pathFromElem(child as SVGPathElement));
		}

		const stroke = new Stroke(parts);
		this.onAddComponent?.(stroke);
	}

	private visit(node: Element) {
		if (node.tagName === 'SVG') {
			this.rootViewBox ??= (node as SVGSVGElement).viewBox?.baseVal;
		}

		for (const child of node.children) {
			switch (child.tagName.toLowerCase()) {
			case 'g':
				if (child.classList.contains(strokeGroupClass)) {
					this.addStroke(child as SVGGElement);
				} else {
					this.visit(child);
				}
				break;
			case 'path':
				this.addPath(child as SVGPathElement);
				break;
			case 'svg':
				this.visit(child as SVGSVGElement);
				break;
			default:
				console.warn('Unknown SVG element,', child, ', ignoring!');
				// TODO: Load into an UnknownObject element.
			}
		}
	}

	public start(onAddComponent: ComponentAddedListener): Rect2 {
		this.onAddComponent = onAddComponent;

		this.rootViewBox = null;
		this.visit(this.source);

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
