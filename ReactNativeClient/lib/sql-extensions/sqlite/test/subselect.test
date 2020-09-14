# 2001 September 15
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
# focus of this file is testing SELECT statements that are part of
# expressions.
#
# $Id: subselect.test,v 1.16 2008/08/04 03:51:24 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Omit this whole file if the library is build without subquery support.
ifcapable !subquery {
  finish_test
  return
}

# Basic sanity checking.  Try a simple subselect.
#
do_test subselect-1.1 {
  execsql {
    CREATE TABLE t1(a int, b int);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(3,4);
    INSERT INTO t1 VALUES(5,6);
  }
  execsql {SELECT * FROM t1 WHERE a = (SELECT count(*) FROM t1)}
} {3 4}

# Try a select with more than one result column.
#
do_test subselect-1.2 {
  set v [catch {execsql {SELECT * FROM t1 WHERE a = (SELECT * FROM t1)}} msg]
  lappend v $msg
} {1 {row value misused}}

# A subselect without an aggregate.
#
do_test subselect-1.3a {
  execsql {SELECT b from t1 where a = (SELECT a FROM t1 WHERE b=2)}
} {2}
do_test subselect-1.3b {
  execsql {SELECT b from t1 where a = (SELECT a FROM t1 WHERE b=4)}
} {4}
do_test subselect-1.3c {
  execsql {SELECT b from t1 where a = (SELECT a FROM t1 WHERE b=6)}
} {6}
do_test subselect-1.3d {
  execsql {SELECT b from t1 where a = (SELECT a FROM t1 WHERE b=8)}
} {}
ifcapable compound {
  do_test subselect-1.3e {
    execsql {
      SELECT b FROM t1
       WHERE a = (SELECT a FROM t1 UNION SELECT b FROM t1 ORDER BY 1);
    }
  } {2}
}

# What if the subselect doesn't return any value.  We should get
# NULL as the result.  Check it out.
#
do_test subselect-1.4 {
  execsql {SELECT b from t1 where a = coalesce((SELECT a FROM t1 WHERE b=5),1)}
} {2}

# Try multiple subselects within a single expression.
#
do_test subselect-1.5 {
  execsql {
    CREATE TABLE t2(x int, y int);
    INSERT INTO t2 VALUES(1,2);
    INSERT INTO t2 VALUES(2,4);
    INSERT INTO t2 VALUES(3,8);
    INSERT INTO t2 VALUES(4,16);
  }
  execsql {
    SELECT y from t2 
    WHERE x = (SELECT sum(b) FROM t1 where a notnull) - (SELECT sum(a) FROM t1)
  }
} {8}

# Try something useful.  Delete every entry from t2 where the
# x value is less than half of the maximum.
#
do_test subselect-1.6 {
  execsql {DELETE FROM t2 WHERE x < 0.5*(SELECT max(x) FROM t2)}
  execsql {SELECT x FROM t2 ORDER BY x}
} {2 3 4}

# Make sure sorting works for SELECTs there used as a scalar expression.
#
do_test subselect-2.1 {
  execsql {
    SELECT (SELECT a FROM t1 ORDER BY a), (SELECT a FROM t1 ORDER BY a DESC)
  }
} {1 5}
do_test subselect-2.2 {
  execsql {
    SELECT 1 IN (SELECT a FROM t1 ORDER BY a);
  }
} {1}
do_test subselect-2.3 {
  execsql {
    SELECT 2 IN (SELECT a FROM t1 ORDER BY a DESC);
  }
} {0}

# Verify that the ORDER BY clause is honored in a subquery.
#
ifcapable compound {
do_test subselect-3.1 {
  execsql {
    CREATE TABLE t3(x int);
    INSERT INTO t3 SELECT a FROM t1 UNION ALL SELECT b FROM t1;
    SELECT * FROM t3 ORDER BY x;
  }
} {1 2 3 4 5 6}
} ;# ifcapable compound
ifcapable !compound {
do_test subselect-3.1 {
  execsql {
    CREATE TABLE t3(x int);
    INSERT INTO t3 SELECT a FROM t1; 
    INSERT INTO t3 SELECT b FROM t1;
    SELECT * FROM t3 ORDER BY x;
  }
} {1 2 3 4 5 6}
} ;# ifcapable !compound

do_test subselect-3.2 {
  execsql {
    SELECT sum(x) FROM (SELECT x FROM t3 ORDER BY x LIMIT 2);
  }
} {3}
do_test subselect-3.3 {
  execsql {
    SELECT sum(x) FROM (SELECT x FROM t3 ORDER BY x DESC LIMIT 2);
  }
} {11}
do_test subselect-3.4 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x);
  }
} {1}
do_test subselect-3.5 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x DESC);
  }
} {6}
do_test subselect-3.6 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x LIMIT 1);
  }
} {1}
do_test subselect-3.7 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x DESC LIMIT 1);
  }
} {6}
do_test subselect-3.8 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x LIMIT 1 OFFSET 2);
  }
} {3}
do_test subselect-3.9 {
  execsql {
    SELECT (SELECT x FROM t3 ORDER BY x DESC LIMIT 1 OFFSET 2);
  }
} {4}
do_test subselect-3.10 {
  execsql {
    SELECT x FROM t3 WHERE x IN
       (SELECT x FROM t3 ORDER BY x DESC LIMIT 1 OFFSET 2);
  }
} {4}

# Ticket #2295.
# Make sure type affinities work correctly on subqueries with
# an ORDER BY clause.
#
do_test subselect-4.1 {
  execsql {
    CREATE TABLE t4(a TEXT, b TEXT);
    INSERT INTO t4 VALUES('a','1');
    INSERT INTO t4 VALUES('b','2');
    INSERT INTO t4 VALUES('c','3');
    SELECT a FROM t4 WHERE b IN (SELECT b FROM t4 ORDER BY b);
  }
} {a b c}
do_test subselect-4.2 {
  execsql {
    SELECT a FROM t4 WHERE b IN (SELECT b FROM t4 ORDER BY b LIMIT 1);
  }
} {a}
do_test subselect-4.3 {
  execsql {
    SELECT a FROM t4 WHERE b IN (SELECT b FROM t4 ORDER BY b DESC LIMIT 1);
  }
} {c}

finish_test
