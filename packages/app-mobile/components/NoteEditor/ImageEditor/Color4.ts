
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

	public static fromHex(hexString: string): Color4 {
		// Remove starting '#' (if present)
		hexString = hexString.match(/^[#]?(.*)$/)[1];
		hexString = hexString.toUpperCase();

		if (!hexString.match(/^[0-9A-F]+$/)) {
			throw new Error(`${hexString} is not in a valid format.`);
		}

		// RGBA or RGB
		if (hexString.length === 3 || hexString.length === 4) {
			// Each character is a component
			const components = hexString.split('');

			// Convert to RRGGBBAA or RRGGBB format
			hexString = components.map(component => `${component}0`).join('');
		}

		if (hexString.length === 6) {
			// Alpha component
			hexString += 'FF';
		}

		const components: number[] = [];
		for (let i = 2; i <= hexString.length; i += 2) {
			const chunk = hexString.substring(i - 2, i);
			components.push(parseInt(chunk, 16) / 255);
		}

		if (components.length !== 4) {
			throw new Error(`Unable to parse ${hexString}: Wrong number of components.`);
		}

		return new Color4(components[0], components[1], components[2], components[3]);
	}

	public eq(other: Color4|null|undefined): boolean {
		if ((other ?? null) === null) {
			return false;
		}

		return this.toHexString() === other.toHexString();
	}

	private hexString: string|null = null;
	public toHexString(): string {
		if (this.hexString) {
			return this.hexString;
		}

		const componentToHex = (component: number): string => {
			const res = Math.round(255 * component).toString(16);

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
		this.hexString = `#${red}${green}${blue}${alpha}`;
		return this.hexString;
	}

	public static red = Color4.ofRGB(1.0, 0.0, 0.0);
	public static green = Color4.ofRGB(0.0, 1.0, 0.0);
	public static blue = Color4.ofRGB(0.0, 0.0, 1.0);
	public static purple = Color4.ofRGB(0.5, 0.2, 0.5);
	public static yellow = Color4.ofRGB(1, 1, 0.1);
	public static clay = Color4.ofRGB(0.8, 0.4, 0.2);
	public static black = Color4.ofRGB(0, 0, 0);
	public static white = Color4.ofRGB(1, 1, 1);
}
