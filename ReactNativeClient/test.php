<?php

$content = file_get_contents('../ElectronClient/app/node_modules/mermaid/dist/mermaid.min.js');

file_put_contents('mermaid.json', json_encode($content));