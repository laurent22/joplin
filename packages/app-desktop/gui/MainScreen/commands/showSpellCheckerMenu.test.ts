import { runtime } from './showSpellCheckerMenu';
import { AppState } from '../../../app.reducer';

jest.mock('../../../services/bridge', () => ({
	__esModule: true,
	default: () => ({
		Menu: {
			buildFromTemplate: jest.fn().mockReturnValue({
				popup: jest.fn(),
			}),
		},
	}),
}));

describe('mapStateTotitle', () => {

	test('should return null if spellchecker.enabled is false', () => {

		const mockState: Partial<AppState> = {
			settings: {
				'spellChecker.enabled': false,
				'spellChecker.languages': ['en-GB'],
			},
		};
		const result = runtime().mapStateToTitle(mockState);
		expect(result).toBeNull();
	});

	test('should return null if spellChecker.languages is empty', () => {
		const mockState: Partial<AppState> = {
			settings: {
				'spellChecker.enabled': true,
				'spellChecker.languages': [],
			},
		};
		const result = runtime().mapStateToTitle(mockState);
		expect(result).toBeNull();
	});

	test('should return list of countryDisplayName with correct format', () => {
		const mockState: Partial<AppState> = {
			settings: {
				'spellChecker.enabled': true,
				'spellChecker.languages': ['en-GB', 'en-US', 'en-CA', 'es-ES', 'es-MX'],
			},
		};
		const result = runtime().mapStateToTitle(mockState);
		expect(result).toBe('en-GB, en-US, en-CA, es-ES, es-MX');

	});
});
