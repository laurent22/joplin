# 2011 August 22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests for foreign keys. Specifically, it tests
# that ticket b1d3a2e531 has been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!foreignkey||!trigger} {
  finish_test
  return
}
set testprefix tkt-b1d3a2e531

do_execsql_test 1.0 { PRAGMA foreign_keys = ON }

do_execsql_test 1.1 {
  CREATE TABLE pp(x PRIMARY KEY);
  CREATE TABLE cc(y REFERENCES pp DEFERRABLE INITIALLY DEFERRED);
  INSERT INTO pp VALUES('abc');
  INSERT INTO cc VALUES('abc');
}
do_execsql_test 1.2 {
  BEGIN;
    DROP TABLE pp;
    DROP TABLE cc;
  COMMIT;
}
do_execsql_test 1.3 {
  CREATE TABLE pp(x PRIMARY KEY);
  CREATE TABLE cc(y REFERENCES pp DEFERRABLE INITIALLY DEFERRED);
  INSERT INTO pp VALUES('abc');
  INSERT INTO cc VALUES('abc');
}
do_execsql_test 1.4 {
  BEGIN;
    DROP TABLE cc;
    DROP TABLE pp;
  COMMIT;
}

do_execsql_test 2.1 {
  CREATE TABLE pp(x PRIMARY KEY);
  CREATE TABLE cc(
    y INTEGER PRIMARY KEY REFERENCES pp DEFERRABLE INITIALLY DEFERRED
  );
  INSERT INTO pp VALUES(5);
  INSERT INTO cc VALUES(5);
}
do_execsql_test 2.2 {
  BEGIN;
    DROP TABLE pp;
    DROP TABLE cc;
  COMMIT;
}
do_execsql_test 2.3 {
  CREATE TABLE pp(x PRIMARY KEY);
  CREATE TABLE cc(
    y INTEGER PRIMARY KEY REFERENCES pp DEFERRABLE INITIALLY DEFERRED
  );
  INSERT INTO pp VALUES(5);
  INSERT INTO cc VALUES(5);
}
do_execsql_test 2.4 {
  BEGIN;
    DROP TABLE cc;
    DROP TABLE pp;
  COMMIT;
}

do_execsql_test 3.1 {
  CREATE TABLE pp1(x PRIMARY KEY);
  CREATE TABLE cc1(y REFERENCES pp1 DEFERRABLE INITIALLY DEFERRED);

  CREATE TABLE pp2(x PRIMARY KEY);
  CREATE TABLE cc2(y REFERENCES pp1 DEFERRABLE INITIALLY DEFERRED);

  INSERT INTO pp1 VALUES(2200);
  INSERT INTO cc1 VALUES(NULL);

  INSERT INTO pp2 VALUES(2200);
  INSERT INTO cc2 VALUES(2200);
}
do_catchsql_test 3.2 {
  BEGIN;
    DELETE FROM pp2;
    DROP TABLE pp1;
    DROP TABLE cc1;
  COMMIT;
} {1 {FOREIGN KEY constraint failed}}
do_catchsql_test 3.3 {
    DROP TABLE cc2;
  COMMIT;
} {0 {}}



finish_test
