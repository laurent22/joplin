import sys
import json

for line in sys.stdin:
    line = line.strip()
    if line:
        try:
            req = json.loads(line)
            print(json.dumps({'id': req['id'], 'results': []}), flush=True)
        except Exception as e:
            print(json.dumps({'id': '', 'results': [], 'error': str(e)}), flush=True)
