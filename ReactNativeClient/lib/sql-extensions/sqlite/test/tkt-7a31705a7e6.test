# 2013 February 26
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
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [7a31705a7e6c95d514e6f20a6900f436bbc9fed8] in the
# name resolver has been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test tkt-7a31705a7e6-1.1 {
  CREATE TABLE t1 (a INTEGER PRIMARY KEY);
  CREATE TABLE t2 (a INTEGER PRIMARY KEY, b INTEGER);
  CREATE TABLE t2x (b INTEGER PRIMARY KEY);
  SELECT t1.a FROM ((t1 JOIN t2 ON t1.a=t2.a) AS x JOIN t2x ON x.b=t2x.b) as y;
} {}

finish_test
