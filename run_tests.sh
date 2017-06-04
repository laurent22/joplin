#!/bin/bash

# Example to test just one method of a test unit:
# php phpunit-5.7.20.phar --filter testConflict ChangeTest tests/Model/ChangeTest.php --bootstrap vendor/autoload.php tests/Model/

# php5.6 phpunit-5.7.20.phar --bootstrap vendor/autoload.php tests/Controller/
php5.6 phpunit-5.7.20.phar --bootstrap vendor/autoload.php tests/Model/