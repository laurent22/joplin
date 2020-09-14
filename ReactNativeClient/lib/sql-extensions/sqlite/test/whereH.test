# 2014-03-31
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
# Test cases for query planning decisions where one candidate index
# covers a proper superset of the WHERE clause terms of another
# candidate index.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test whereH-1.1 {
  CREATE TABLE t1(a,b,c,d);
  CREATE INDEX t1abc ON t1(a,b,c);
  CREATE INDEX t1bc ON t1(b,c);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c>=? ORDER BY c;
} {/INDEX t1abc /}
do_execsql_test whereH-1.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c>=? ORDER BY c;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-2.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d);
  CREATE INDEX t1bc ON t1(b,c);
  CREATE INDEX t1abc ON t1(a,b,c);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c>=? ORDER BY c;
} {/INDEX t1abc /}
do_execsql_test whereH-2.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c>=? ORDER BY c;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-3.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1cd ON t1(c,d);
  CREATE INDEX t1bcd ON t1(b,c,d);
  CREATE INDEX t1abcd ON t1(a,b,c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-3.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-4.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1cd ON t1(c,d);
  CREATE INDEX t1abcd ON t1(a,b,c,d);
  CREATE INDEX t1bcd ON t1(b,c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-4.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-5.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1bcd ON t1(b,c,d);
  CREATE INDEX t1cd ON t1(c,d);
  CREATE INDEX t1abcd ON t1(a,b,c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-5.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-6.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1bcd ON t1(b,c,d);
  CREATE INDEX t1abcd ON t1(a,b,c,d);
  CREATE INDEX t1cd ON t1(c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-6.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-7.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1abcd ON t1(a,b,c,d);
  CREATE INDEX t1bcd ON t1(b,c,d);
  CREATE INDEX t1cd ON t1(c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-7.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}

do_execsql_test whereH-8.1 {
  DROP TABLE t1;
  CREATE TABLE t1(a,b,c,d,e);
  CREATE INDEX t1abcd ON t1(a,b,c,d);
  CREATE INDEX t1cd ON t1(c,d);
  CREATE INDEX t1bcd ON t1(b,c,d);

  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {/INDEX t1abcd /}
do_execsql_test whereH-8.2 {
  EXPLAIN QUERY PLAN
  SELECT d FROM t1 WHERE a=? AND b=? AND c=? AND d>=? ORDER BY d;
} {~/TEMP B-TREE FOR ORDER BY/}



finish_test
