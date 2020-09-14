# 2014-07-30
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
# focus of this file is testing the CREATE UNIQUE INDEX statement
# to verify that ticket 9a6daf340df99ba93c53bcf8fa83d9f28040d2a8
# has been fixed:
#
#  drh added on 2014-07-30 12:33:04:
#
#  The CREATE UNIQUE INDEX on the third line below does not fail even
#  though the x column values are not all unique.
#
#     CREATE TABLE t1(x NOT NULL);
#     INSERT INTO t1 VALUES(1),(2),(2),(3);
#     CREATE UNIQUE INDEX t1x ON t1(x);
#
# If the index is created before the INSERT, then uniqueness is enforced
# at the point of the INSERT. Note that the NOT NULL on the indexed column
# seems to be required in order to exhibit this bug.
#
# "PRAGMA integrity_check" does not detect the resulting malformed database.
# That might be considered a separate issue.
#
# Bisecting shows that this problem was introduced by the addition of
#  WITHOUT ROWID support in version 3.8.2, specifically in check-in
# [c80e229dd9c1230] on 2013-11-07. This problem was reported on the mailing
# list by Pavel Pimenov.  and primary keys, and the UNIQUE constraint
# on table columns
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

foreach {id sql} {
   1 {CREATE TABLE t1(x TEXT PRIMARY KEY, y NOT NULL) WITHOUT ROWID}
   2 {CREATE TABLE t1(x TEXT PRIMARY KEY, y NOT NULL)}
   3 {CREATE TABLE t1(x TEXT PRIMARY KEY, y) WITHOUT ROWID}
   4 {CREATE TABLE t1(x TEXT PRIMARY KEY, y)}
} {
  do_test $id.1 {
    db eval {DROP TABLE IF EXISTS t1}
    db eval $sql
    db eval {INSERT INTO t1(x,y) VALUES(1,1),(2,2),(3,2),(4,3)}
  } {}
  do_test $id.2 {
    catchsql {CREATE UNIQUE INDEX t1y ON t1(y)}
  } {1 {UNIQUE constraint failed: t1.y}}
}

foreach {id sql} {
   5 {CREATE TABLE t1(w,x,y NOT NULL,z NOT NULL,PRIMARY KEY(w,x)) WITHOUT ROWID}
   6 {CREATE TABLE t1(w,x,y NOT NULL,z NOT NULL,PRIMARY KEY(w,x))}
   7 {CREATE TABLE t1(w,x,y NOT NULL,z,PRIMARY KEY(w,x)) WITHOUT ROWID}
   8 {CREATE TABLE t1(w,x,y NOT NULL,z,PRIMARY KEY(w,x))}
   9 {CREATE TABLE t1(w,x,y,z NOT NULL,PRIMARY KEY(w,x)) WITHOUT ROWID}
  10 {CREATE TABLE t1(w,x,y,z NOT NULL,PRIMARY KEY(w,x))}
  11 {CREATE TABLE t1(w,x,y,z,PRIMARY KEY(w,x)) WITHOUT ROWID}
  12 {CREATE TABLE t1(w,x,y,z,PRIMARY KEY(w,x))}
} {
  do_test $id.1 {
    db eval {DROP TABLE IF EXISTS t1}
    db eval $sql
    db eval {INSERT INTO t1(w,x,y,z) VALUES(1,2,3,4),(2,3,3,4)}
  } {}
  do_test $id.2 {
    catchsql {CREATE UNIQUE INDEX t1yz ON t1(y,z)}
  } {1 {UNIQUE constraint failed: t1.y, t1.z}}
}

do_catchsql_test 13.1 {
  CREATE TABLE err1(a,b,c,UNIQUE(rowid));
} {1 {no such column: rowid}}
do_catchsql_test 13.2 {
  CREATE TABLE err1(a,b,c,PRIMARY KEY(rowid));
} {1 {no such column: rowid}}


finish_test
