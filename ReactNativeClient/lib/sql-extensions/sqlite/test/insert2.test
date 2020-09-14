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
# focus of this file is testing the INSERT statement that takes is
# result from a SELECT.
#
# $Id: insert2.test,v 1.19 2008/01/16 18:20:42 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix insert2

# Create some tables with data that we can select against
#
do_test insert2-1.0 {
  execsql {CREATE TABLE d1(n int, log int);}
  for {set i 1} {$i<=20} {incr i} {
    for {set j 0} {(1<<$j)<$i} {incr j} {}
    execsql "INSERT INTO d1 VALUES($i,$j)"
  }
  execsql {SELECT * FROM d1 ORDER BY n}
} {1 0 2 1 3 2 4 2 5 3 6 3 7 3 8 3 9 4 10 4 11 4 12 4 13 4 14 4 15 4 16 4 17 5 18 5 19 5 20 5}

# Insert into a new table from the old one.
#
do_test insert2-1.1.1 {
  execsql {
    CREATE TABLE t1(log int, cnt int);
    PRAGMA count_changes=on;
  }
  ifcapable explain {
    execsql {
      EXPLAIN INSERT INTO t1 SELECT log, count(*) FROM d1 GROUP BY log;
    }
  }
  execsql {
    INSERT INTO t1 SELECT log, count(*) FROM d1 GROUP BY log;
  }
} {6}
do_test insert2-1.1.2 {
  db changes
} {6}
do_test insert2-1.1.3 {
  execsql {SELECT * FROM t1 ORDER BY log}
} {0 1 1 1 2 2 3 4 4 8 5 4}

ifcapable compound {
do_test insert2-1.2.1 {
  catch {execsql {DROP TABLE t1}}
  execsql {
    CREATE TABLE t1(log int, cnt int);
    INSERT INTO t1 
       SELECT log, count(*) FROM d1 GROUP BY log
       EXCEPT SELECT n-1,log FROM d1;
  }
} {4}
do_test insert2-1.2.2 {
  execsql {
    SELECT * FROM t1 ORDER BY log;
  }
} {0 1 3 4 4 8 5 4}
do_test insert2-1.3.1 {
  catch {execsql {DROP TABLE t1}}
  execsql {
    CREATE TABLE t1(log int, cnt int);
    PRAGMA count_changes=off;
    INSERT INTO t1 
       SELECT log, count(*) FROM d1 GROUP BY log
       INTERSECT SELECT n-1,log FROM d1;
  }
} {}
do_test insert2-1.3.2 {
  execsql {
    SELECT * FROM t1 ORDER BY log;
  }
} {1 1 2 2}
} ;# ifcapable compound
execsql {PRAGMA count_changes=off;}

do_test insert2-1.4 {
  catch {execsql {DROP TABLE t1}}
  set r [execsql {
    CREATE TABLE t1(log int, cnt int);
    CREATE INDEX i1 ON t1(log);
    CREATE INDEX i2 ON t1(cnt);
    INSERT INTO t1 SELECT log, count() FROM d1 GROUP BY log;
    SELECT * FROM t1 ORDER BY log;
  }]
  lappend r [execsql {SELECT cnt FROM t1 WHERE log=3}]
  lappend r [execsql {SELECT log FROM t1 WHERE cnt=4 ORDER BY log}]
} {0 1 1 1 2 2 3 4 4 8 5 4 4 {3 5}}

do_test insert2-2.0 {
  execsql {
    CREATE TABLE t3(a,b,c);
    CREATE TABLE t4(x,y);
    INSERT INTO t4 VALUES(1,2);
    SELECT * FROM t4;
  }
} {1 2}
do_test insert2-2.1 {
  execsql {
    INSERT INTO t3(a,c) SELECT * FROM t4;
    SELECT * FROM t3;
  }
} {1 {} 2}
do_test insert2-2.2 {
  execsql {
    DELETE FROM t3;
    INSERT INTO t3(c,b) SELECT * FROM t4;
    SELECT * FROM t3;
  }
} {{} 2 1}
do_test insert2-2.3 {
  execsql {
    DELETE FROM t3;
    INSERT INTO t3(c,a,b) SELECT x, 'hi', y FROM t4;
    SELECT * FROM t3;
  }
} {hi 2 1}

integrity_check insert2-3.0

# File table t4 with lots of data
#
do_test insert2-3.1 {
  execsql {
    SELECT * from t4;
  }
} {1 2}
do_test insert2-3.2 {
  set x [db total_changes]
  execsql {
    BEGIN;
    INSERT INTO t4 VALUES(2,4);
    INSERT INTO t4 VALUES(3,6);
    INSERT INTO t4 VALUES(4,8);
    INSERT INTO t4 VALUES(5,10);
    INSERT INTO t4 VALUES(6,12);
    INSERT INTO t4 VALUES(7,14);
    INSERT INTO t4 VALUES(8,16);
    INSERT INTO t4 VALUES(9,18);
    INSERT INTO t4 VALUES(10,20);
    COMMIT;
  }
  expr [db total_changes] - $x
} {9}
do_test insert2-3.2.1 {
  execsql {
    SELECT count(*) FROM t4;
  }
} {10}
do_test insert2-3.3 {
  ifcapable subquery {
    execsql {
      BEGIN;
      INSERT INTO t4 SELECT x+(SELECT max(x) FROM t4),y FROM t4;
      INSERT INTO t4 SELECT x+(SELECT max(x) FROM t4),y FROM t4;
      INSERT INTO t4 SELECT x+(SELECT max(x) FROM t4),y FROM t4;
      INSERT INTO t4 SELECT x+(SELECT max(x) FROM t4),y FROM t4;
      COMMIT;
      SELECT count(*) FROM t4;
    }
  } else {
    db function max_x_t4 {execsql {SELECT max(x) FROM t4}}
    execsql {
      BEGIN;
      INSERT INTO t4 SELECT x+max_x_t4() ,y FROM t4;
      INSERT INTO t4 SELECT x+max_x_t4() ,y FROM t4;
      INSERT INTO t4 SELECT x+max_x_t4() ,y FROM t4;
      INSERT INTO t4 SELECT x+max_x_t4() ,y FROM t4;
      COMMIT;
      SELECT count(*) FROM t4;
    }
  }
} {160}
do_test insert2-3.4 {
  execsql {
    BEGIN;
    UPDATE t4 SET y='lots of data for the row where x=' || x
                     || ' and y=' || y || ' - even more data to fill space';
    COMMIT;
    SELECT count(*) FROM t4;
  }
} {160}
do_test insert2-3.5 {
  ifcapable subquery {
    execsql {
      BEGIN;
      INSERT INTO t4 SELECT x+(SELECT max(x)+1 FROM t4),y FROM t4;
      SELECT count(*) from t4;
      ROLLBACK;
    }
  } else {
    execsql {
      BEGIN;
      INSERT INTO t4 SELECT x+max_x_t4()+1,y FROM t4;
      SELECT count(*) from t4;
      ROLLBACK;
    }
  }
} {320}
do_test insert2-3.6 {
  execsql {
    SELECT count(*) FROM t4;
  }
} {160}
do_test insert2-3.7 {
  execsql {
    BEGIN;
    DELETE FROM t4 WHERE x!=123;
    SELECT count(*) FROM t4;
    ROLLBACK;
  }
} {1}
do_test insert2-3.8 {
  db changes
} {159}
integrity_check insert2-3.9

# Ticket #901
#
ifcapable tempdb {
  do_test insert2-4.1 {
    execsql {
      CREATE TABLE Dependencies(depId integer primary key,
        class integer, name str, flag str);
      CREATE TEMPORARY TABLE DepCheck(troveId INT, depNum INT,
        flagCount INT, isProvides BOOL, class INTEGER, name STRING,
        flag STRING);
      INSERT INTO DepCheck 
         VALUES(-1, 0, 1, 0, 2, 'libc.so.6', 'GLIBC_2.0');
      INSERT INTO Dependencies 
         SELECT DISTINCT 
             NULL, 
             DepCheck.class, 
             DepCheck.name, 
             DepCheck.flag 
         FROM DepCheck LEFT OUTER JOIN Dependencies ON 
             DepCheck.class == Dependencies.class AND 
             DepCheck.name == Dependencies.name AND 
             DepCheck.flag == Dependencies.flag 
         WHERE 
             Dependencies.depId is NULL;
    };
  } {}
}

#--------------------------------------------------------------------
# Test that the INSERT works when the SELECT statement (a) references
# the table being inserted into and (b) is optimized to use an index
# only.
do_test insert2-5.1 {
  execsql {
    CREATE TABLE t2(a, b);
    INSERT INTO t2 VALUES(1, 2);
    CREATE INDEX t2i1 ON t2(a);
    INSERT INTO t2 SELECT a, 3 FROM t2 WHERE a = 1;
    SELECT * FROM t2;
  }
} {1 2 1 3}
ifcapable subquery {
  do_test insert2-5.2 {
    execsql {
      INSERT INTO t2 SELECT (SELECT a FROM t2), 4;
      SELECT * FROM t2;
    }
  } {1 2 1 3 1 4}
}

do_execsql_test 6.0 { 
  CREATE TABLE t5(a, b, c DEFAULT 'c', d);
}
do_execsql_test 6.1 {
  INSERT INTO t5(a) SELECT 456 UNION ALL SELECT 123 ORDER BY 1;
  SELECT * FROM t5 ORDER BY rowid;
} {123 {} c {}   456 {} c {}}

ifcapable fts3 {
  do_execsql_test 6.2 {
    CREATE VIRTUAL TABLE t0 USING fts4(a);
  }
  do_execsql_test 6.3 {
    INSERT INTO t0 SELECT 0 UNION SELECT 0 AS 'x' ORDER BY x;
    SELECT * FROM t0;
  } {0}
}


finish_test
