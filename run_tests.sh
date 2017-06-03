#!/bin/bash
# php phpunit-5.7.20.phar --bootstrap vendor/autoload.php tests/Model/
# php phpunit-5.7.20.phar --filter testConflict ChangeTest tests/Model/ChangeTest.php --bootstrap vendor/autoload.php tests/Model/
# php phpunit-5.7.20.phar --filter SynchronizerControllerTest tests/Controller/SynchronizerControllerTest.php --bootstrap vendor/autoload.php tests/Controller/

php phpunit-5.7.20.phar --bootstrap vendor/autoload.php tests/Controller/