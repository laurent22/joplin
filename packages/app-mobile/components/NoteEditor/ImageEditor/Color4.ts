
export default class Color4 {
	private constructor(
		public readonly r: number,
		public readonly g: number,
		public readonly b: number,
		public readonly a: number
	) { }

	/**
	 * @param red The red component of the color, in the range [0, 1]
	 * @param green The green component, in [0, 1] where 1 is most green
	 * @param blue The blue component
	 * @return A Color4 with the given red, green, blue values and an alpha channel of 1.
	 */
	public static ofRGB(red: number, green: number, blue: number): Color4 {
		return new Color4(red, green, blue, 1.0);
	}

	public static ofRGBA(red: number, green: number, blue: number, alpha: number): Color4 {
		return new Color4(red, green, blue, alpha);
	}

	public toHexString(): string {
		const componentToHex = (component: number): string => {
			const res = Math.floor(255 * component).toString(16);

			if (res.length === 1) {
				return `0${res}`;
			}
			return res;
		};

		const alpha = componentToHex(this.a);
		const red = componentToHex(this.r);
		const green = componentToHex(this.g);
		const blue = componentToHex(this.b);
		if (alpha === 'ff') {
			return `#${red}${green}${blue}`;
		}
		return `#${red}${green}${blue}${alpha}`;
	}

	public static red = Color4.ofRGB(1.0, 0.0, 0.0);
	public static green = Color4.ofRGB(0.0, 1.0, 0.0);
	public static blue = Color4.ofRGB(0.0, 0.0, 1.0);
	public static purple = Color4.ofRGB(0.5, 0.2, 0.5);
}
