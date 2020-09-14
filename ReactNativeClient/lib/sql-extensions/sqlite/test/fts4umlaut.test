# 2018 December 3
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS5 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts4umlaut

ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts4(x, tokenize=unicode61);
  CREATE VIRTUAL TABLE t2 USING fts4(
      x, 
      tokenize=unicode61 "remove_diacritics=2"
  );
}

foreach {tn q res1 res2} {
  1 "Hà Nội"                  0 1
  2 "Hà Noi"                  1 1
  3 "Ha Noi"                  1 1
  4 "Ha N\u1ed9i"             0 1
  5 "Ha N\u006fi"             1 1
  6 "Ha N\u006f\u0302i"       1 1
  7 "Ha N\u006f\u0323\u0302i" 1 1
} {
  do_execsql_test 1.$tn.1 {
    DELETE FROM t1;
    INSERT INTO t1(rowid, x) VALUES (1, 'Ha Noi');
    SELECT count(*) FROM t1 WHERE t1 MATCH $q
  } $res1
  do_execsql_test 1.$tn.2 {
    DELETE FROM t1;
    INSERT INTO t1(rowid, x) VALUES (1, $q);
    SELECT count(*) FROM t1 WHERE t1 MATCH 'Ha Noi'
  } $res1

  do_execsql_test 1.$tn.3 {
    DELETE FROM t2;
    INSERT INTO t2(rowid, x) VALUES (1, 'Ha Noi');
    SELECT count(*) FROM t2 WHERE t2 MATCH $q
  } $res2
  do_execsql_test 1.$tn.4 {
    DELETE FROM t2;
    INSERT INTO t2(rowid, x) VALUES (1, $q);
    SELECT count(*) FROM t2 WHERE t2 MATCH 'Ha Noi'
  } $res2
}

finish_test
