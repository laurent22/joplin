import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from thesaurus_nlp.wordnet_service import WordNetService


class WordNetServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = WordNetService()

    def test_get_related_words_returns_candidates_for_known_word(self):
        results = self.service.get_related_words('Large')

        self.assertTrue(any(result.word == 'big' and result.pos == 'a' for result in results))

    def test_get_related_words_returns_empty_for_unknown_word(self):
        self.assertEqual(self.service.get_related_words('asdfghjkl'), [])

    def test_get_related_words_returns_empty_for_blank_input(self):
        self.assertEqual(self.service.get_related_words('   '), [])


if __name__ == '__main__':
    unittest.main()
