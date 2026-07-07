import json
import sys
from collections.abc import Callable, Iterator
from typing import TextIO

from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse

class Worker:
    """NDJSON stdio adapter for the TS PythonProcessManager."""

    def __init__(
        self,
        callback: Callable[[RankRequest], RankResponse],
        stdin: TextIO = sys.stdin,
        stdout: TextIO = sys.stdout,
    ):
        self.callback = callback
        self.stdin = stdin
        self.stdout = stdout

    def _get_lines(self) -> Iterator[str]:
        for line in self.stdin:
            line = line.strip()
            if line:
                yield line

    def _read_line(self, line: str) -> RankRequest:
        return RankRequest.model_validate_json(line)

    def _request_id_or_empty(self, line: str) -> str:
        try:
            data = json.loads(line)
            return str(data.get('id', ''))
        except Exception:
            return ''

    def run(self) -> None:
        for line in self._get_lines():
            try:
                request = self._read_line(line)
                response = self.callback(request)
                print(response.model_dump_json(by_alias=True), file=self.stdout, flush=True)
            except Exception as error:
                error_response = RankResponse(id=self._request_id_or_empty(line), results=[], error=str(error))
                print(error_response.model_dump_json(by_alias=True), file=self.stdout, flush=True)
