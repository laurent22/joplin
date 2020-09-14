# 2014-03-21
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
# focus of this file is testing that the block-sort optimization.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderby6

# Run all tests twice.  Once with a normal table and a second time
# with a WITHOUT ROWID table
#
foreach {tn rowidclause} {1 {} 2 {WITHOUT ROWID}} {

  # Construct a table with 1000 rows and a split primary key
  #
  reset_db
  do_test $tn.1 {
    db eval "CREATE TABLE t1(a,b,c,PRIMARY KEY(b,c)) $rowidclause;"
    db eval {
      WITH RECURSIVE
       cnt(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM cnt WHERE x<1000)
     INSERT INTO t1 SELECT x, x%40, x/40 FROM cnt;
    }
  } {}

  # Run various ORDER BY queries that can benefit from block-sort.
  # Compare the output to the same output using a full-sort enforced
  # by adding + to each term of the ORDER BY clause.
  #
  do_execsql_test $tn.2 {
    SELECT b,a,c FROM t1 ORDER BY b,a,c;
  } [db eval {SELECT b,a,c FROM t1 ORDER BY +b,+a,+c}]
  do_execsql_test $tn.3 {
    SELECT b,a,c FROM t1 ORDER BY b,c DESC,a;
  } [db eval {SELECT b,a,c FROM t1 ORDER BY +b,+c DESC,+a}]
  do_execsql_test $tn.4 {
    SELECT b,a,c FROM t1 ORDER BY b DESC,c,a;
  } [db eval {SELECT b,a,c FROM t1 ORDER BY +b DESC,+c,+a}]
  do_execsql_test $tn.5 {
    SELECT b,a,c FROM t1 ORDER BY b DESC,a,c;
  } [db eval {SELECT b,a,c FROM t1 ORDER BY +b DESC,+a,+c}]

  # LIMIT and OFFSET clauses on block-sort queries.
  #
  do_execsql_test $tn.11 {
    SELECT a FROM t1 ORDER BY b, a LIMIT 10 OFFSET 20;
  } {840 880 920 960 1000 1 41 81 121 161}
  do_execsql_test $tn.11x {
    SELECT a FROM t1 ORDER BY +b, a LIMIT 10 OFFSET 20;
  } {840 880 920 960 1000 1 41 81 121 161}

  do_execsql_test $tn.12 {
    SELECT a FROM t1 ORDER BY b DESC, a LIMIT 10 OFFSET 20;
  } {839 879 919 959 999 38 78 118 158 198}
  do_execsql_test $tn.12 {
    SELECT a FROM t1 ORDER BY +b DESC, a LIMIT 10 OFFSET 20;
  } {839 879 919 959 999 38 78 118 158 198}

  do_execsql_test $tn.13 {
    SELECT a FROM t1 ORDER BY b, a DESC LIMIT 10 OFFSET 45;
  } {161 121 81 41 1 962 922 882 842 802}
  do_execsql_test $tn.13x {
    SELECT a FROM t1 ORDER BY +b, a DESC LIMIT 10 OFFSET 45;
  } {161 121 81 41 1 962 922 882 842 802}

  do_execsql_test $tn.14 {
    SELECT a FROM t1 ORDER BY b DESC, a LIMIT 10 OFFSET 45;
  } {838 878 918 958 998 37 77 117 157 197}
  do_execsql_test $tn.14x {
    SELECT a FROM t1 ORDER BY +b DESC, a LIMIT 10 OFFSET 45;
  } {838 878 918 958 998 37 77 117 157 197}

  # Many test cases where the LIMIT+OFFSET window is in various
  # alignments with block-sort boundaries.
  #
  foreach {tx limit offset orderby} {
     1  10 24 {+b,+a}
     2  10 25 {+b,+a}
     3  10 26 {+b,+a}
     4  10 39 {+b,+a}
     5  10 40 {+b,+a}
     6  10 41 {+b,+a}
     7  27 24 {+b,+a}
     8  27 49 {+b,+a}
     11 10 24 {+b DESC,+a}
     12 10 25 {+b DESC,+a}
     13 10 26 {+b DESC,+a}
     14 10 39 {+b DESC,+a}
     15 10 40 {+b DESC,+a}
     16 10 41 {+b DESC,+a}
     17 27 24 {+b DESC,+a}
     18 27 49 {+b DESC,+a}
     21 10 24 {+b,+a DESC}
     22 10 25 {+b,+a DESC}
     23 10 26 {+b,+a DESC}
     24 10 39 {+b,+a DESC}
     25 10 40 {+b,+a DESC}
     26 10 41 {+b,+a DESC}
     27 27 24 {+b,+a DESC}
     28 27 49 {+b,+a DESC}
     31 10 24 {+b DESC,+a DESC}
     32 10 25 {+b DESC,+a DESC}
     33 10 26 {+b DESC,+a DESC}
     34 10 39 {+b DESC,+a DESC}
     35 10 40 {+b DESC,+a DESC}
     36 10 41 {+b DESC,+a DESC}
     37 27 24 {+b DESC,+a DESC}
     38 27 49 {+b DESC,+a DESC}
  } {
    set sql1 "SELECT a FROM t1 ORDER BY $orderby LIMIT $limit OFFSET $offset;"
    set sql2 [string map {+ {}} $sql1]
    # puts $sql2\n$sql1\n[db eval $sql2]
    do_test $tn.21.$tx {db eval $::sql2} [db eval $sql1]
  }

  ########################################################################
  # A second test table, t2, has many columns open to sorting.
  do_test $tn.31 {
    db eval "CREATE TABLE t2(a,b,c,d,e,f,PRIMARY KEY(b,c,d,e,f)) $rowidclause;"
    db eval {
      WITH RECURSIVE
       cnt(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM cnt WHERE x<242)
     INSERT INTO t2 SELECT x,  x%3, (x/3)%3, (x/9)%3, (x/27)%3, (x/81)%3
                      FROM cnt;
    }
  } {}

  do_execsql_test $tn.32 {
    SELECT a FROM t2 ORDER BY b,c,d,e,f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f;}]
  do_execsql_test $tn.33 {
    SELECT a FROM t2 ORDER BY b,c,d,e,+f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f;}]
  do_execsql_test $tn.34 {
    SELECT a FROM t2 ORDER BY b,c,d,+e,+f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f;}]
  do_execsql_test $tn.35 {
    SELECT a FROM t2 ORDER BY b,c,+d,+e,+f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f;}]
  do_execsql_test $tn.36 {
    SELECT a FROM t2 ORDER BY b,+c,+d,+e,+f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f;}]

  do_execsql_test $tn.37 {
    SELECT a FROM t2 ORDER BY b,c,d,e,f DESC;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f DESC;}]
  do_execsql_test $tn.38 {
    SELECT a FROM t2 ORDER BY b,c,d,e DESC,f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e DESC,+f;}]
  do_execsql_test $tn.39 {
    SELECT a FROM t2 ORDER BY b,c,d DESC,e,f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d DESC,+e,+f;}]
  do_execsql_test $tn.40 {
    SELECT a FROM t2 ORDER BY b,c DESC,d,e,f;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c DESC,+d,+e,+f;}]
  do_execsql_test $tn.41 {
    SELECT a FROM t2 ORDER BY b DESC,c,d,e,f;
  } [db eval {SELECT a FROM t2 ORDER BY +b DESC,+c,+d,+e,+f;}]

  do_execsql_test $tn.42 {
    SELECT a FROM t2 ORDER BY b DESC,c DESC,d,e,f LIMIT 31;
  } [db eval {SELECT a FROM t2 ORDER BY +b DESC,+c DESC,+d,+e,+f LIMIT 31}]
  do_execsql_test $tn.43 {
    SELECT a FROM t2 ORDER BY b,c,d,e,f DESC LIMIT 8 OFFSET 7;
  } [db eval {SELECT a FROM t2 ORDER BY +b,+c,+d,+e,+f DESC LIMIT 8 OFFSET 7}]


}



finish_test
