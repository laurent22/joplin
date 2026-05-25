import http_createServer from 'http';
http_createServer.createServer(function (req, res) {
  res.writeHead(200, {'content-type': 'application/json'})
  res.end(JSON.stringify({ok: true}))
}).listen(1337)
