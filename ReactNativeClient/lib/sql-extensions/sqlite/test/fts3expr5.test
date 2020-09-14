# 2006 September 9
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
# focus of this script is testing the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3expr5

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

proc test_fts3expr {expr} {
  db one {SELECT fts3_exprtest('simple', $expr, 'a', 'b', 'c')}
}

#-------------------------------------------------------------------------
# Various forms of empty phrase expressions.
#
do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t0 USING fts3(x);
  SELECT rowid FROM t0 WHERE x MATCH '';
} {}
do_execsql_test 1.1 {
  SELECT rowid FROM t0 WHERE x MATCH '""';
} {}
do_execsql_test 1.2 {
  SELECT rowid FROM t0 WHERE x MATCH '"" ""';
} {}
do_execsql_test 1.3 {
  SELECT rowid FROM t0 WHERE x MATCH '"" OR ""';
} {}
do_execsql_test 1.4 {
  SELECT rowid FROM t0 WHERE x MATCH '"" NOT ""';
} {}
do_execsql_test 1.5 {
  SELECT rowid FROM t0 WHERE x MATCH '""""';
} {}

#-------------------------------------------------------------------------
# Various forms of empty phrase expressions.
#
set sqlite_fts3_enable_parentheses 1
do_test 2.0 {
  test_fts3expr {(a:123)(b:234)()(c:456)}
} {AND {AND {PHRASE 0 0 123} {PHRASE 1 0 234}} {PHRASE 2 0 456}}
do_test 2.1 {
  test_fts3expr {(a:123)(b:234)(c:456)}
} {AND {AND {PHRASE 0 0 123} {PHRASE 1 0 234}} {PHRASE 2 0 456}}
do_test 2.2 {
  list [catch { test_fts3expr {"123" AND ( )} } msg] $msg
} {1 {Error parsing expression}}

finish_test
