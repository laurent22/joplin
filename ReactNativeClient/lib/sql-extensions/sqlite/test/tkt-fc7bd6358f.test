# 2013 March 05
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [fc7bd6358f]:
#
# The following SQL yields an incorrect result (zero rows) in all
# versions of SQLite between 3.6.14 and 3.7.15.2:
#
#    CREATE TABLE t(textid TEXT);
#    INSERT INTO t VALUES('12');
#    INSERT INTO t VALUES('34');
#    CREATE TABLE i(intid INTEGER PRIMARY KEY);
#    INSERT INTO i VALUES(12);
#    INSERT INTO i VALUES(34);
#
#    SELECT t1.textid AS a, i.intid AS b, t2.textid AS c
#      FROM t t1, i, t t2
#     WHERE t1.textid = i.intid
#       AND t1.textid = t2.textid;
#
# The correct result should be two rows, one with 12|12|12 and the other
# with 34|34|34. With this bug, no rows are returned. Bisecting shows that
# this bug was introduced with check-in [dd4d67a67454] on 2009-04-23. 
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-fc7bd6358f.100 {
  db eval {
    CREATE TABLE t(textid TEXT);
    INSERT INTO t VALUES('12');
    INSERT INTO t VALUES('34');
    CREATE TABLE i(intid INTEGER PRIMARY KEY);
    INSERT INTO i VALUES(12);
    INSERT INTO i VALUES(34);
  }
} {}
unset -nocomplain from
unset -nocomplain where
unset -nocomplain a
unset -nocomplain b
foreach {a from} {
  1 {FROM t t1, i, t t2}
  2 {FROM i, t t1, t t2}
  3 {FROM t t1, t t2, i}
} {
  foreach {b where} {
    1 {WHERE t1.textid=i.intid AND t1.textid=t2.textid}
    2 {WHERE i.intid=t1.textid AND t1.textid=t2.textid}
    3 {WHERE t1.textid=i.intid AND i.intid=t2.textid}
    4 {WHERE t1.textid=i.intid AND t2.textid=i.intid}
    5 {WHERE i.intid=t1.textid AND i.intid=t2.textid}
    6 {WHERE i.intid=t1.textid AND t2.textid=i.intid}
    7 {WHERE t1.textid=t2.textid AND i.intid=t2.textid}
    8 {WHERE t1.textid=t2.textid AND t2.textid=i.intid}
  } {
    do_test tkt-fc7bd6358f.110.$a.$b.1 {
       db eval {PRAGMA automatic_index=ON}
       db eval "SELECT t1.textid, i.intid, t2.textid $from $where"
    } {12 12 12 34 34 34}
    do_test tkt-fc7bd6358f.110.$a.$b.2 {
       db eval {PRAGMA automatic_index=OFF}
       db eval "SELECT t1.textid, i.intid, t2.textid $from $where"
    } {12 12 12 34 34 34}
  }
}

    
finish_test
