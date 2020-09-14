# 2008 June 24
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
# $Id: selectB.test,v 1.10 2009/04/02 16:59:47 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

proc test_transform {testname sql1 sql2 results} {
  set ::vdbe1 [list]
  set ::vdbe2 [list]
  db eval "explain $sql1" { lappend ::vdbe1 $opcode }
  db eval "explain $sql2" { lappend ::vdbe2 $opcode }

  do_test $testname.transform {
    set ::vdbe1
  } $::vdbe2

  set ::sql1 $sql1
  do_test $testname.sql1 {
    execsql $::sql1
  } $results

  set ::sql2 $sql2
  do_test $testname.sql2 {
    execsql $::sql2
  } $results
}

do_test selectB-1.1 {
  execsql {
    CREATE TABLE t1(a, b, c);
    CREATE TABLE t2(d, e, f);

    INSERT INTO t1 VALUES( 2,  4,  6);
    INSERT INTO t1 VALUES( 8, 10, 12);
    INSERT INTO t1 VALUES(14, 16, 18);

    INSERT INTO t2 VALUES(3,   6,  9);
    INSERT INTO t2 VALUES(12, 15, 18);
    INSERT INTO t2 VALUES(21, 24, 27);
  }
} {}

for {set ii 1} {$ii <= 2} {incr ii} {

  if {$ii == 2} {
    do_test selectB-2.1 {
      execsql {
        CREATE INDEX i1 ON t1(a);
        CREATE INDEX i2 ON t2(d);
      }
    } {}
  }

  test_transform selectB-$ii.2 {
    SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2)
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2
  } {2 8 14 3 12 21}
  
  test_transform selectB-$ii.3 {
    SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2) ORDER BY 1
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1
  } {2 3 8 12 14 21}
  
  test_transform selectB-$ii.4 {
    SELECT * FROM 
      (SELECT a FROM t1 UNION ALL SELECT d FROM t2) 
    WHERE a>10 ORDER BY 1
  } {
    SELECT a FROM t1 WHERE a>10 UNION ALL SELECT d FROM t2 WHERE d>10 ORDER BY 1
  } {12 14 21}
  
  test_transform selectB-$ii.5 {
    SELECT * FROM 
      (SELECT a FROM t1 UNION ALL SELECT d FROM t2) 
    WHERE a>10 ORDER BY a
  } {
    SELECT a FROM t1 WHERE a>10 
      UNION ALL 
    SELECT d FROM t2 WHERE d>10 
    ORDER BY a
  } {12 14 21}
  
  test_transform selectB-$ii.6 {
    SELECT * FROM 
      (SELECT a FROM t1 UNION ALL SELECT d FROM t2 WHERE d > 12) 
    WHERE a>10 ORDER BY a
  } {
    SELECT a FROM t1 WHERE a>10
      UNION ALL 
    SELECT d FROM t2 WHERE d>12 AND d>10
    ORDER BY a
  } {14 21}
  
  test_transform selectB-$ii.7 {
    SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2) ORDER BY 1 
    LIMIT 2
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1 LIMIT 2
  } {2 3}
  
  test_transform selectB-$ii.8 {
    SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2) ORDER BY 1 
    LIMIT 2 OFFSET 3
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1 LIMIT 2 OFFSET 3
  } {12 14}

  test_transform selectB-$ii.9 {
    SELECT * FROM (
      SELECT a FROM t1 UNION ALL SELECT d FROM t2 UNION ALL SELECT c FROM t1
    ) 
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 UNION ALL SELECT c FROM t1
  } {2 8 14 3 12 21 6 12 18}
  
  test_transform selectB-$ii.10 {
    SELECT * FROM (
      SELECT a FROM t1 UNION ALL SELECT d FROM t2 UNION ALL SELECT c FROM t1
    ) ORDER BY 1
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 UNION ALL SELECT c FROM t1
    ORDER BY 1
  } {2 3 6 8 12 12 14 18 21}
  
  test_transform selectB-$ii.11 {
    SELECT * FROM (
      SELECT a FROM t1 UNION ALL SELECT d FROM t2 UNION ALL SELECT c FROM t1
    ) WHERE a>=10 ORDER BY 1 LIMIT 3
  } {
    SELECT a FROM t1 WHERE a>=10 UNION ALL SELECT d FROM t2 WHERE d>=10
    UNION ALL SELECT c FROM t1 WHERE c>=10
    ORDER BY 1 LIMIT 3
  } {12 12 14}

  test_transform selectB-$ii.12 {
    SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2 LIMIT 2)
  } {
    SELECT a FROM t1 UNION ALL SELECT d FROM t2 LIMIT 2
  } {2 8}

  # An ORDER BY in a compound subqueries defeats flattening.  Ticket #3773
  # test_transform selectB-$ii.13 {
  #   SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY a ASC)
  # } {
  #   SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1 ASC
  # } {2 3 8 12 14 21}
  # 
  # test_transform selectB-$ii.14 {
  #  SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY a DESC)
  # } {
  #  SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1 DESC
  # } {21 14 12 8 3 2}
  #
  # test_transform selectB-$ii.14 {
  #   SELECT * FROM (
  #     SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY a DESC
  #   ) LIMIT 2 OFFSET 2
  # } {
  #   SELECT a FROM t1 UNION ALL SELECT d FROM t2 ORDER BY 1 DESC
  #    LIMIT 2 OFFSET 2
  # } {12 8}
  #
  # test_transform selectB-$ii.15 {
  #   SELECT * FROM (
  #     SELECT a, b FROM t1 UNION ALL SELECT d, e FROM t2 ORDER BY a ASC, e DESC
  #  )
  # } {
  #   SELECT a, b FROM t1 UNION ALL SELECT d, e FROM t2 ORDER BY a ASC, e DESC
  # } {2 4 3 6 8 10 12 15 14 16 21 24}
}

do_test selectB-3.0 {
  execsql {
    DROP INDEX i1;
    DROP INDEX i2;
  }
} {}

for {set ii 3} {$ii <= 6} {incr ii} {

  switch $ii {
    4 {
      optimization_control db query-flattener off
    }
    5 {
      optimization_control db query-flattener on
      do_test selectB-5.0 {
        execsql {
          CREATE INDEX i1 ON t1(a);
          CREATE INDEX i2 ON t1(b);
          CREATE INDEX i3 ON t1(c);
          CREATE INDEX i4 ON t2(d);
          CREATE INDEX i5 ON t2(e);
          CREATE INDEX i6 ON t2(f);
        }
      } {}
    }
    6 {
      optimization_control db query-flattener off
    }
  }

  do_test selectB-$ii.1 {
    execsql {
      SELECT DISTINCT * FROM 
        (SELECT c FROM t1 UNION ALL SELECT e FROM t2) 
      ORDER BY 1;
    }
  } {6 12 15 18 24}
  
  do_test selectB-$ii.2 {
    execsql {
      SELECT c, count(*) FROM 
        (SELECT c FROM t1 UNION ALL SELECT e FROM t2) 
      GROUP BY c ORDER BY 1;
    }
  } {6 2 12 1 15 1 18 1 24 1}
  do_test selectB-$ii.3 {
    execsql {
      SELECT c, count(*) FROM 
        (SELECT c FROM t1 UNION ALL SELECT e FROM t2) 
      GROUP BY c HAVING count(*)>1;
    }
  } {6 2}
  do_test selectB-$ii.4 {
    execsql {
      SELECT t4.c, t3.a FROM 
        (SELECT c FROM t1 UNION ALL SELECT e FROM t2) AS t4, t1 AS t3
      WHERE t3.a=14
      ORDER BY 1
    }
  } {6 14 6 14 12 14 15 14 18 14 24 14}
  
  do_test selectB-$ii.5 {
    execsql {
      SELECT d FROM t2 
      EXCEPT 
      SELECT a FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2)
    }
  } {}
  do_test selectB-$ii.6 {
    execsql {
      SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2)
      EXCEPT 
      SELECT * FROM (SELECT a FROM t1 UNION ALL SELECT d FROM t2)
    }
  } {}
  do_test selectB-$ii.7 {
    execsql {
      SELECT c FROM t1
      EXCEPT 
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
    }
  } {12}
  do_test selectB-$ii.8 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      EXCEPT 
      SELECT c FROM t1
    }
  } {9 15 24 27}
  do_test selectB-$ii.9 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      EXCEPT 
      SELECT c FROM t1
      ORDER BY c DESC
    }
  } {27 24 15 9}
  
  do_test selectB-$ii.10 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      UNION 
      SELECT c FROM t1
      ORDER BY c DESC
    }
  } {27 24 18 15 12 9 6}
  do_test selectB-$ii.11 {
    execsql {
      SELECT c FROM t1
      UNION 
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      ORDER BY c
    }
  } {6 9 12 15 18 24 27}
  do_test selectB-$ii.12 {
    execsql {
      SELECT c FROM t1 UNION SELECT e FROM t2 UNION ALL SELECT f FROM t2
      ORDER BY c
    }
  } {6 9 12 15 18 18 24 27}
  do_test selectB-$ii.13 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      UNION 
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      ORDER BY 1
    }
  } {6 9 15 18 24 27}
  
  do_test selectB-$ii.14 {
    execsql {
      SELECT c FROM t1
      INTERSECT 
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      ORDER BY 1
    }
  } {6 18}
  do_test selectB-$ii.15 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      INTERSECT 
      SELECT c FROM t1
      ORDER BY 1
    }
  } {6 18}
  do_test selectB-$ii.16 {
    execsql {
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      INTERSECT 
      SELECT * FROM (SELECT e FROM t2 UNION ALL SELECT f FROM t2)
      ORDER BY 1
    }
  } {6 9 15 18 24 27}

  do_test selectB-$ii.17 {
    execsql {
      SELECT * FROM (
        SELECT a FROM t1 UNION ALL SELECT d FROM t2 LIMIT 4
      ) LIMIT 2
    }
  } {2 8}

  do_test selectB-$ii.18 {
    execsql {
      SELECT * FROM (
        SELECT a FROM t1 UNION ALL SELECT d FROM t2 LIMIT 4 OFFSET 2
      ) LIMIT 2
    }
  } {14 3}

  do_test selectB-$ii.19 {
    execsql {
      SELECT * FROM (
        SELECT DISTINCT (a/10) FROM t1 UNION ALL SELECT DISTINCT(d%2) FROM t2
      )
    }
  } {0 1 1 0}

  do_test selectB-$ii.20 {
    execsql {
      SELECT DISTINCT * FROM (
        SELECT DISTINCT (a/10) FROM t1 UNION ALL SELECT DISTINCT(d%2) FROM t2
      )
    }
  } {0 1}

  do_test selectB-$ii.21 {
    execsql {
      SELECT * FROM (SELECT * FROM t1 UNION ALL SELECT * FROM t2) ORDER BY a+b
    }
  } {2 4 6 3 6 9 8 10 12 12 15 18 14 16 18 21 24 27}

  do_test selectB-$ii.22 {
    execsql {
      SELECT * FROM (SELECT 345 UNION ALL SELECT d FROM t2) ORDER BY 1;
    }
  } {3 12 21 345}

  do_test selectB-$ii.23 {
    execsql {
      SELECT x, y FROM (
        SELECT a AS x, b AS y FROM t1
        UNION ALL
        SELECT a*10 + 0.1, f*10 + 0.1 FROM t1 JOIN t2 ON (c=d)
        UNION ALL
        SELECT a*100, b*100 FROM t1
      ) ORDER BY 1;
    }
  } {2 4 8 10 14 16 80.1 180.1 200 400 800 1000 1400 1600}

  do_test selectB-$ii.24 {
    execsql {
      SELECT x, y FROM (
        SELECT a AS x, b AS y FROM t1
        UNION ALL
        SELECT a*10 + 0.1, f*10 + 0.1 FROM t1 LEFT JOIN t2 ON (c=d)
        UNION ALL
        SELECT a*100, b*100 FROM t1
      ) ORDER BY 1;
    }
  } {2 4 8 10 14 16 20.1 {} 80.1 180.1 140.1 {} 200 400 800 1000 1400 1600}

  do_test selectB-$ii.25 {
    execsql {
      SELECT x+y FROM (
        SELECT a AS x, b AS y FROM t1
        UNION ALL
        SELECT a*10 + 0.1, f*10 + 0.1 FROM t1 LEFT JOIN t2 ON (c=d)
        UNION ALL
        SELECT a*100, b*100 FROM t1
      ) WHERE y+x NOT NULL ORDER BY 1;
    }
  } {6 18 30 260.2 600 1800 3000}
}

finish_test
