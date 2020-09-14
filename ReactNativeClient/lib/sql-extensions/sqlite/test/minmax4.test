# 2012 February 02
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
# Test for queries of the form:  
#
#    SELECT p, max(q) FROM t1;
#
# Demonstration that the value returned for p is on the same row as 
# the maximum q.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix minmax4

ifcapable !compound {
  finish_test
  return
}

do_test minmax4-1.1 {
  db eval {
    CREATE TABLE t1(p,q);
    SELECT p, max(q) FROM t1;
  }
} {{} {}}
do_test minmax4-1.2 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {{} {}}
do_test minmax4-1.3 {
  db eval {
    INSERT INTO t1 VALUES(1,2);
    SELECT p, max(q) FROM t1;
  }
} {1 2}
do_test minmax4-1.4 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {1 2}
do_test minmax4-1.5 {
  db eval {
    INSERT INTO t1 VALUES(3,4);
    SELECT p, max(q) FROM t1;
  }
} {3 4}
do_test minmax4-1.6 {
  db eval {
    SELECT p, min(q) FROM t1;
    SELECT p FROM (SELECT p, min(q) FROM t1);
  }
} {1 2 1}
do_test minmax4-1.7 {
  db eval {
    INSERT INTO t1 VALUES(5,0);
    SELECT p, max(q) FROM t1;
    SELECT p FROM (SELECT max(q), p FROM t1);
  }
} {3 4 3}
do_test minmax4-1.8 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {5 0}
do_test minmax4-1.9 {
  db eval {
    INSERT INTO t1 VALUES(6,1);
    SELECT p, max(q) FROM t1;
    SELECT p FROM (SELECT max(q), p FROM t1);
  }
} {3 4 3}
do_test minmax4-1.10 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {5 0}
do_test minmax4-1.11 {
  db eval {
    INSERT INTO t1 VALUES(7,NULL);
    SELECT p, max(q) FROM t1;
  }
} {3 4}
do_test minmax4-1.12 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {5 0}
do_test minmax4-1.13 {
  db eval {
    DELETE FROM t1 WHERE q IS NOT NULL;
    SELECT p, max(q) FROM t1;
  }
} {7 {}}
do_test minmax4-1.14 {
  db eval {
    SELECT p, min(q) FROM t1;
  }
} {7 {}}

do_test minmax4-2.1 {
  db eval {
    CREATE TABLE t2(a,b,c);
    INSERT INTO t2 VALUES
         (1,null,2),
         (1,2,3),
         (1,1,4),
         (2,3,5);
    SELECT a, max(b), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 2 3 2 3 5}
do_test minmax4-2.2 {
  db eval {
    SELECT a, min(b), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 1 4 2 3 5}
do_test minmax4-2.3 {
  db eval {
    SELECT a, min(b), avg(b), count(b), c FROM t2 GROUP BY a ORDER BY a DESC;
  }
} {2 3 3.0 1 5 1 1 1.5 2 4}
do_test minmax4-2.4 {
  db eval {
    SELECT a, min(b), max(b), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 1 2 3 2 3 3 5}
do_test minmax4-2.5 {
  db eval {
    SELECT a, max(b), min(b), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 2 1 4 2 3 3 5}
do_test minmax4-2.6 {
  db eval {
    SELECT a, max(b), b, max(c), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 2 1 4 4 2 3 3 5 5}
do_test minmax4-2.7 {
  db eval {
    SELECT a, min(b), b, min(c), c FROM t2 GROUP BY a ORDER BY a;
  }
} {1 1 {} 2 2 2 3 3 5 5}

#-------------------------------------------------------------------------
foreach {tn sql} {
  1 { CREATE INDEX i1 ON t1(a) }
  2 { CREATE INDEX i1 ON t1(a DESC) }
  3 { }
} {
  reset_db
  do_execsql_test 3.$tn.0 {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(NULL, 1);
  }
  execsql $sql
  do_execsql_test 3.$tn.1 {
    SELECT min(a), b FROM t1;
  } {{} 1}
  do_execsql_test 3.$tn.2 {
    SELECT min(a), b FROM t1 WHERE a<50;
  } {{} {}}
  do_execsql_test 3.$tn.3 {
    INSERT INTO t1 VALUES(2, 2);
  }
  do_execsql_test 3.$tn.4 {
    SELECT min(a), b FROM t1;
  } {2 2}
  do_execsql_test 3.$tn.5 {
    SELECT min(a), b FROM t1 WHERE a<50;
  } {2 2}
}

#-------------------------------------------------------------------------
reset_db
do_execsql_test 4.0 {
  CREATE TABLE t0 (c0, c1);
  CREATE INDEX i0 ON t0(c1, c1 + 1 DESC);
  INSERT INTO t0(c0) VALUES (1);
}
do_execsql_test 4.1 {
  SELECT MIN(t0.c1), t0.c0 FROM t0 WHERE t0.c1 ISNULL; 
} {{} 1}

#-------------------------------------------------------------------------
reset_db
do_execsql_test 5.0 {
  CREATE TABLE t1 (a, b);
  INSERT INTO t1 VALUES(123, NULL);
  CREATE INDEX i1 ON t1(a, b DESC);
}
do_execsql_test 5.1 {
  SELECT MIN(a) FROM t1 WHERE a=123;
} {123}

#-------------------------------------------------------------------------
# Tests for ticket f8a7060ece.
#
reset_db
do_execsql_test 6.1.0 {
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(NULL, 1, 'x');
  CREATE INDEX i1 ON t1(a);
}
do_execsql_test 6.1.1 {
  SELECT min(a), b, c FROM t1 WHERE c='x';
} {{} 1 x}
do_execsql_test 6.1.2 {
  INSERT INTO t1 VALUES(1,    2, 'y');
} {}
do_execsql_test 6.1.3 {
  SELECT min(a), b, c FROM t1 WHERE c='x';
} {{} 1 x}

do_execsql_test 6.2.0 {
  CREATE TABLE t0(c0 UNIQUE, c1);
  INSERT INTO t0(c1) VALUES (0);
  INSERT INTO t0(c0) VALUES (0);
  CREATE VIEW v0(c0, c1) AS 
      SELECT t0.c1, t0.c0 FROM t0 WHERE CAST(t0.rowid AS INT) = 1;
}
do_execsql_test 6.2.1 {
  SELECT c0, c1 FROM v0;
} {0 {}}
do_execsql_test 6.2.2 {
  SELECT v0.c0, MIN(v0.c1) FROM v0;
} {0 {}}

finish_test
