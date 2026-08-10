

type RandomFunction = ()=> number; // Should behave like Math.random, with output in [0,1)

// eslint-disable-next-line import/prefer-default-export
export const randomWeightedElement = <T> (items: T[], weights: number[], random: RandomFunction = Math.random): T|null => {
	if (items.length !== weights.length) {
		throw new Error('Items and weights must have the same length');
	}
	if (items.length === 0) return null;

	// Normalize the weights so that they add up to one.
	const weightsSum = weights.reduce((a, b) => a + b, 0);

	if (!isFinite(weightsSum) || weightsSum === 0) {
		throw new Error(`Weights must sum to a finite, non-zero value. Provided weights: ${JSON.stringify(weights)}`);
	}

	const normalizedWeights = weights.map(w => w / (weightsSum || 1));

	// Pair items and weights
	const weightedItems = items.map((item, index) => ({ item, weight: normalizedWeights[index] }));

	let weightSum = 0;
	const value = random();

	// Find the last item with `value` in its range
	for (const item of weightedItems) {
		weightSum += item.weight;
		if (weightSum > value) {
			return item.item;
		}
	}

	return null;
};
