# 2007 Sep 3
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
# Tests on the sqlite3_open_v2() interface.
#
# $Id: openv2.test,v 1.2 2009/06/11 17:32:45 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

db close
forcedelete test.db test.db-journal
do_test openv2-1.1 {
  set rc [catch {sqlite3 db test.db -create 0} msg]
  lappend rc $msg
} {1 {unable to open database file}}
do_test openv2-1.2 {
  info commands db
} {}
do_test openv2-1.3 {
  sqlite3 db test.db
  db eval {CREATE TABLE t1(x)}
  db close
  sqlite3 db test.db -readonly 1
  db eval {SELECT name FROM sqlite_master}
} {t1}
do_test openv2-1.4 {
  catchsql {
    INSERT INTO t1 VALUES(123)
  }
} {1 {attempt to write a readonly database}}

# Ticket #3908
# Honor SQLITE_OPEN_READONLY even on an in-memory database, even though
# this is pointless.
#
do_test openv2-2.1 {
  db close
  sqlite3 db :memory: -readonly 1
  db eval {SELECT * FROM sqlite_master}
} {}
do_test openv2-2.2 {
  catchsql {CREATE TABLE t1(x)}
} {1 {attempt to write a readonly database}}


finish_test
