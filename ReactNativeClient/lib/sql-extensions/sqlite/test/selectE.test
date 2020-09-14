# 2013-05-07
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for compound SELECT statements
# that have ORDER BY clauses with collating sequences that differ
# from the collating sequence used for comparison in the compound.
# 
# Ticket 6709574d2a8d8b9be3a9cb1afbf4ff2de48ea4e7:
# drh added on 2013-05-06 15:21:16:
#
# In the code shown below (which is intended to be run from the
# sqlite3.exe command-line tool) the three SELECT statements should all
# generate the same answer. But the third one does not. It is as if the
# COLLATE clause on the ORDER BY somehow got pulled into the EXCEPT
# operator. Note that the ".print" commands are instructions to the
# sqlite3.exe shell program to output delimiter lines so that you can more
# easily tell where the output of one query ends and the next query
# begins. 
# 
#     CREATE TABLE t1(a);
#     INSERT INTO t1 VALUES('abc'),('def');
#     CREATE TABLE t2(a);
#     INSERT INTO t2 VALUES('DEF');
# 
#     SELECT a FROM t1 EXCEPT SELECT a FROM t2 ORDER BY a;
#     .print -----
#     SELECT a FROM (SELECT a FROM t1 EXCEPT SELECT a FROM t2)
#      ORDER BY a COLLATE nocase;
#     .print -----
#     SELECT a FROM t1 EXCEPT SELECT a FROM t2 ORDER BY a COLLATE nocase;
# 
# Bisecting shows that this problem was introduced in SQLite version 3.6.0
# by check-in [8bbfa97837a74ef] on 2008-06-15. 
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test selectE-1.0 {
  db eval {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES('abc'),('def'),('ghi');
    CREATE TABLE t2(a);
    INSERT INTO t2 VALUES('DEF'),('abc');
    CREATE TABLE t3(a);
    INSERT INTO t3 VALUES('def'),('jkl');

    SELECT a FROM t1 EXCEPT SELECT a FROM t2
     ORDER BY a COLLATE nocase;
  }
} {def ghi}
do_test selectE-1.1 {
  db eval {
    SELECT a FROM t2 EXCEPT SELECT a FROM t3
     ORDER BY a COLLATE nocase;
  }
} {abc DEF}
do_test selectE-1.2 {
  db eval {
    SELECT a FROM t2 EXCEPT SELECT a FROM t3
     ORDER BY a COLLATE binary;
  }
} {DEF abc}
do_test selectE-1.3 {
  db eval {
    SELECT a FROM t2 EXCEPT SELECT a FROM t3
     ORDER BY a;
  }
} {DEF abc}

do_test selectE-2.1 {
  db eval {
    DELETE FROM t2;
    DELETE FROM t3;
    INSERT INTO t2 VALUES('ABC'),('def'),('GHI'),('jkl');
    INSERT INTO t3 SELECT lower(a) FROM t2;
    SELECT a COLLATE nocase FROM t2 EXCEPT SELECT a FROM t3
     ORDER BY 1
  }
} {}
do_test selectE-2.2 {
  db eval {
    SELECT a COLLATE nocase FROM t2 EXCEPT SELECT a FROM t3
     ORDER BY 1 COLLATE binary
  }
} {}

do_catchsql_test selectE-3.1 {
  SELECT 1 EXCEPT SELECT 2 ORDER BY 1 COLLATE nocase EXCEPT SELECT 3;
} {1 {ORDER BY clause should come after EXCEPT not before}}


finish_test
