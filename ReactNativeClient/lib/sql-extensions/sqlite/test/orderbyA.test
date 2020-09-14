# 2019-09-21
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# Specifically, it tests cases where the expressions in a GROUP BY 
# clause are the same as those in the ORDER BY clause.
# 

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderbyA

proc do_sortcount_test {tn sql cnt res} {
  set eqp [execsql "EXPLAIN QUERY PLAN $sql"]
  set rcnt [regexp -all {USE TEMP} $eqp]
  uplevel [list do_test         $tn.1 [list set {} $rcnt] $cnt]
  uplevel [list do_execsql_test $tn.2 $sql $res]
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES('one',   1, 11);
  INSERT INTO t1 VALUES('three', 7, 11);
  INSERT INTO t1 VALUES('one',   2, 11);
  INSERT INTO t1 VALUES('one',   3, 11);
  INSERT INTO t1 VALUES('two',   4, 11);
  INSERT INTO t1 VALUES('two',   6, 11);
  INSERT INTO t1 VALUES('three', 8, 11);
  INSERT INTO t1 VALUES('two',   5, 11);
  INSERT INTO t1 VALUES('three', 9, 11);
}

foreach {tn idx} {
  1 {}
  2 {CREATE INDEX i1 ON t1(a)}
  3 {CREATE INDEX i1 ON t1(a DESC)}
} {
  execsql { DROP INDEX IF EXISTS i1 }
  execsql $idx

  # $match is the number of temp-table sorts we expect if the GROUP BY
  # can use the same sort order as the ORDER BY. $nomatch is the number
  # of expected sorts if the GROUP BY and ORDER BY are not compatible.
  set match   1
  set nomatch 2
  if {$tn>=2} {
    set match   0
    set nomatch 1
  }

  do_sortcount_test 1.$tn.1.1 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a
  } $match {one 6 three 24 two 15}
  do_sortcount_test 1.$tn.1.2 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a DESC
  } $match {two 15 three 24 one 6}
  
  do_sortcount_test 1.$tn.2.1 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a||''
  } $nomatch {one 6 three 24 two 15}
  do_sortcount_test 1.$tn.2.2 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a||'' DESC
  } $nomatch {two 15 three 24 one 6}
  
  do_sortcount_test 1.$tn.3.1 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a NULLS LAST
  } $nomatch {one 6 three 24 two 15}
  do_sortcount_test 1.$tn.3.2 {
    SELECT a, sum(b) FROM t1 GROUP BY a ORDER BY a DESC NULLS FIRST
  } $nomatch {two 15 three 24 one 6}
}

#-------------------------------------------------------------------------
do_execsql_test 2.0 {
  CREATE TABLE t2(a, b, c);
  INSERT INTO t2 VALUES(1, 'one', 1);
  INSERT INTO t2 VALUES(1, 'two', 2);
  INSERT INTO t2 VALUES(1, 'one', 3);
  INSERT INTO t2 VALUES(1, 'two', 4);
  INSERT INTO t2 VALUES(1, 'one', 5);
  INSERT INTO t2 VALUES(1, 'two', 6);

  INSERT INTO t2 VALUES(2, 'one', 7);
  INSERT INTO t2 VALUES(2, 'two', 8);
  INSERT INTO t2 VALUES(2, 'one', 9);
  INSERT INTO t2 VALUES(2, 'two', 10);
  INSERT INTO t2 VALUES(2, 'one', 11);
  INSERT INTO t2 VALUES(2, 'two', 12);

  INSERT INTO t2 VALUES(NULL, 'one', 13);
  INSERT INTO t2 VALUES(NULL, 'two', 14);
  INSERT INTO t2 VALUES(NULL, 'one', 15);
  INSERT INTO t2 VALUES(NULL, 'two', 16);
  INSERT INTO t2 VALUES(NULL, 'one', 17);
  INSERT INTO t2 VALUES(NULL, 'two', 18);
}

foreach {tn idx} {
  1 {}

  2 { CREATE INDEX i2 ON t2(a, b)           }
  3 { CREATE INDEX i2 ON t2(a DESC, b DESC) }

  4 { CREATE INDEX i2 ON t2(a, b DESC)      }
  5 { CREATE INDEX i2 ON t2(a DESC, b)      }
} {
  execsql { DROP INDEX IF EXISTS i2 }
  execsql $idx


  set nSort [expr ($tn==2 || $tn==3) ? 0 : 1]
  do_sortcount_test 2.$tn.1.1 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a, b;
  } $nSort {{} one 45  {} two 48  1 one 9  1 two 12  2 one 27  2 two 30}
  do_sortcount_test 2.$tn.1.2 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a DESC, b DESC;
  } $nSort {2 two 30  2 one 27  1 two 12  1 one 9  {} two 48  {} one 45}

  set nSort [expr ($tn==4 || $tn==5) ? 0 : 1]
  do_sortcount_test 2.$tn.2.1 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a, b DESC;
  } $nSort { {} two 48  {} one 45  1 two 12  1 one 9  2 two 30 2 one 27 }
  do_sortcount_test 2.$tn.2.2 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a DESC, b;
  } $nSort { 2 one 27  2 two 30  1 one 9  1 two 12  {} one 45 {} two 48 }

  # ORDER BY can never piggyback on the GROUP BY sort if it uses 
  # non-standard NULLS behaviour.
  set nSort [expr $tn==1 ? 2 : 1]
  do_sortcount_test 2.$tn.3.1 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a, b DESC NULLS FIRST;
  } $nSort { {} two 48  {} one 45  1 two 12  1 one 9  2 two 30 2 one 27 }
  do_sortcount_test 2.$tn.3.2 {
    SELECT a, b, sum(c) FROM t2 GROUP BY a, b ORDER BY a DESC, b NULLS LAST;
  } $nSort { 2 one 27  2 two 30  1 one 9  1 two 12  {} one 45 {} two 48 }
}


finish_test
