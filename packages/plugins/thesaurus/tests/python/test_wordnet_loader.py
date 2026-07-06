import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src' / 'python'))

import wordnet_loader


class WordnetLoaderTests(unittest.TestCase):
    def setUp(self):
        wordnet_loader._wordnet_backend = None

    def test_load_wordnet_data_initializes_a_backend(self):
        wordnet_loader.load_wordnet_data()
        self.assertIsNotNone(wordnet_loader._wordnet_backend)

    def test_get_synonym_candidates_is_case_insensitive(self):
        results = wordnet_loader.get_synonym_candidates('Large')
        self.assertTrue(any(item['word'] == 'big' for item in results))

        uppercase_results = wordnet_loader.get_synonym_candidates('LARGE')
        self.assertEqual(results, uppercase_results)

    def test_get_synonym_candidates_returns_empty_for_unknown_words(self):
        results = wordnet_loader.get_synonym_candidates('asdfghjkl')
        self.assertEqual(results, [])

    def test_get_synonym_candidates_returns_empty_for_blank_input(self):
        self.assertEqual(wordnet_loader.get_synonym_candidates('   '), [])

    def test_main_prints_lookup_results_for_cli_words(self):
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            wordnet_loader.main(['Large', 'asdfghjkl'])

        output = buffer.getvalue()
        self.assertIn('Large', output)
        self.assertIn('asdfghjkl', output)


if __name__ == '__main__':
    unittest.main()
