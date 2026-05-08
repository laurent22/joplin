
// SeededRandom provides a very simple random number generator
// that can be seeded (since NodeJS built-ins can't).
//
// See also:
// - https://arxiv.org/pdf/1704.00358
// - https://en.wikipedia.org/wiki/Middle-square_method

// Some large odd number, see https://en.wikipedia.org/wiki/Weyl_sequence
const step = BigInt('0x12345678ABCDE123'); // uint64
const maxSize = BigInt(1) << BigInt(64);

const extractMiddle = (value: bigint, halfSize: bigint) => {
	// Remove the lower quarter
	const quarterSize = halfSize / BigInt(2);
	value >>= quarterSize;

	// Remove the upper quarter
	const halfMaximumValue = BigInt(1) << halfSize;
	value %= halfMaximumValue;

	return value;
};

export interface RandomState {
	value: bigint|string;
	step: bigint|string;
}

export default class SeededRandom {
	private value_: bigint;
	private nextStep_: bigint = step;
	private halfSize_ = BigInt(32);

	public constructor(
		seed: number|bigint|string,
	) {
		this.value_ = typeof seed !== 'bigint' ? BigInt(seed) : seed;
	}

	public static fromState({ value, step }: RandomState) {
		const random = new SeededRandom(value);
		random.nextStep_ = typeof step !== 'bigint' ? BigInt(step) : step;
		return random;
	}

	// Returns a state that can be used to save/restore this random number generator.
	public get state(): RandomState {
		return { value: this.value_, step: this.nextStep_ };
	}

	public next() {
		this.value_ = this.value_ * this.value_ + this.nextStep_;

		// Move to the next item in the sequence. Mod to prevent from getting
		// too large. See https://en.wikipedia.org/wiki/Weyl_sequence.
		this.nextStep_ = (step + this.nextStep_) % maxSize;

		this.value_ = extractMiddle(this.value_, this.halfSize_);
		return this.value_;
	}

	// The resultant range includes `a` but excludes `b`.
	public nextInRange(a: number, b: number) {
		if (b <= a + 1) return a;

		const range = b - a;
		return Number(this.next() % BigInt(range)) + a;
	}
}
