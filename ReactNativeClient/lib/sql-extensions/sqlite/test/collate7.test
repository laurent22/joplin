#
# 2007 May 7
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is the experimental sqlite3_create_collation_v2()
# API.
#
# $Id: collate7.test,v 1.2 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set ::caseless_del 0
proc caseless_cmp {zLeft zRight} {
  string compare -nocase $zLeft $zRight
}

do_test collate7-1.1 {
  set cmd [list incr ::caseless_del]
  sqlite3_create_collation_v2 db CASELESS caseless_cmp $cmd
  set ::caseless_del
} {0}
do_test collate7-1.2 {
  sqlite_delete_collation db CASELESS
  set ::caseless_del
} {1}
do_test collate7-1.3 {
  catchsql {
    CREATE TABLE abc(a COLLATE CASELESS, b, c);
  }
} {1 {no such collation sequence: CASELESS}}
do_test collate7-1.4 {
  sqlite3_create_collation_v2 db CASELESS caseless_cmp {incr ::caseless_del}
  db close
  set ::caseless_del
} {2}

do_test collate7-2.1 {
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  sqlite3_create_collation_v2 db CASELESS caseless_cmp {incr ::caseless_del}
  execsql {
    PRAGMA encoding='utf-16';
    CREATE TABLE abc16(a COLLATE CASELESS, b, c);
  } db
  set ::caseless_del
} {2}
do_test collate7-2.2 {
  execsql {
    SELECT * FROM abc16 WHERE a < 'abc';
  }
  set ::caseless_del
} {2}
do_test collate7-2.3 {
  sqlite_delete_collation db CASELESS
  set ::caseless_del
} {3}
do_test collate7-2.4 {
  catchsql {
    SELECT * FROM abc16 WHERE a < 'abc';
  }
} {1 {no such collation sequence: CASELESS}}

finish_test
