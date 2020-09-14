# 2014-03-04
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file implements tests to verify that ticket [4ef7e3cfca] has been
# fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-4ef7e3cfca

do_catchsql_test 1.1 {
  CREATE TABLE x(a);
  CREATE TRIGGER t AFTER INSERT ON x BEGIN
    SELECT * FROM x WHERE abc.a = 1;
  END;
  INSERT INTO x VALUES('assert');
} {1 {no such column: abc.a}}

reset_db
do_execsql_test 2.1 {
  CREATE TABLE w(a);
  CREATE TABLE x(a);
  CREATE TABLE y(a);
  CREATE TABLE z(a);

  INSERT INTO x(a) VALUES(5);
  INSERT INTO y(a) VALUES(10);

  CREATE TRIGGER t AFTER INSERT ON w BEGIN
    INSERT INTO z
    SELECT (SELECT x.a + y.a FROM y) FROM x;
  END;
  INSERT INTO w VALUES('incorrect');
}
do_execsql_test 2.2 {
  SELECT * FROM z;
} {15}

reset_db
do_execsql_test 3.1 {
  CREATE TABLE w(a);
  CREATE TABLE x(b);
  CREATE TABLE y(a);
  CREATE TABLE z(a);

  INSERT INTO x(b) VALUES(5);
  INSERT INTO y(a) VALUES(10);

  CREATE TRIGGER t AFTER INSERT ON w BEGIN
    INSERT INTO z
    SELECT (SELECT x.b + y.a FROM y) FROM x;
  END;
  INSERT INTO w VALUES('assert');
}
do_execsql_test 3.2 {
  SELECT * FROM z;
} {15}

finish_test
