import json
import sys
from typing import Any, Dict, List

from wordnet_loader import get_synonym_candidates


def make_error_response(request_id: str, message: str) -> Dict[str, Any]:
    return {
        'id': request_id or '',
        'results': [],
        'error': message,
    }


def process_request(line: str) -> Dict[str, Any]:
    try:
        request = json.loads(line)
    except json.JSONDecodeError as exc:
        return make_error_response('', f'Invalid JSON: {exc}')

    request_id = request.get('id', '')
    word = request.get('word', '')
    context = request.get('context', '')
    top_n = request.get('topN', 10)

    if not isinstance(word, str) or not word.strip():
        return make_error_response(request_id, 'word must be a non-empty string')

    try:
        results: List[Dict[str, Any]] = get_synonym_candidates(word)

        if isinstance(top_n, int) and top_n >= 0:
            results = results[:top_n]

        return {
            'id': request_id,
            'results': results,
        }
    except Exception as exc:
        return make_error_response(request_id, str(exc))


def main() -> None:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        response = process_request(line)
        sys.stdout.write(json.dumps(response, ensure_ascii=False) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
