# 2008 October 13
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
# it tests that affinities and collation sequences are correctly applied
# in aggregate queries.
#
# $Id: tkt3493.test,v 1.2 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3493-1.1 {
  execsql {
    BEGIN;
    CREATE TABLE A (id INTEGER PRIMARY KEY AUTOINCREMENT, val TEXT);
    INSERT INTO A VALUES(1,'123');
    INSERT INTO A VALUES(2,'456');
    CREATE TABLE B (id INTEGER PRIMARY KEY AUTOINCREMENT, val TEXT);
    INSERT INTO B VALUES(1,1);
    INSERT INTO B VALUES(2,2);
    CREATE TABLE A_B (B_id INTEGER NOT NULL, A_id INTEGER);
    INSERT INTO A_B VALUES(1,1);
    INSERT INTO A_B VALUES(2,2);
    COMMIT;
  }
} {}
do_test tkt3493-1.2 {
  execsql {
    SELECT 
      CASE 
         WHEN B.val = 1 THEN 'XYZ' 
         ELSE A.val 
      END AS Col1
    FROM B  
    LEFT OUTER JOIN A_B ON B.id = A_B.B_id  
    LEFT OUTER JOIN A ON A.id = A_B.A_id
    ORDER BY Col1 ASC;
  }
} {456 XYZ}
do_test tkt3493-1.3 {
  execsql {
    SELECT DISTINCT
      CASE 
         WHEN B.val = 1 THEN 'XYZ' 
         ELSE A.val 
      END AS Col1
    FROM B  
    LEFT OUTER JOIN A_B ON B.id = A_B.B_id  
    LEFT OUTER JOIN A ON A.id = A_B.A_id
    ORDER BY Col1 ASC;
  }
} {456 XYZ}
do_test tkt3493-1.4 {
  execsql {
    SELECT b.val, CASE WHEN b.val = 1 THEN 'xyz' ELSE b.val END AS col1 FROM b;
  }
} {1 xyz 2 2}
do_test tkt3493-1.5 {
  execsql {
    SELECT DISTINCT 
      b.val, 
      CASE WHEN b.val = 1 THEN 'xyz' ELSE b.val END AS col1 
    FROM b;
  }
} {1 xyz 2 2}
do_test tkt3493-1.6 {
  execsql {
    SELECT DISTINCT 
      b.val, 
      CASE WHEN b.val = '1' THEN 'xyz' ELSE b.val END AS col1 
    FROM b;
  }
} {1 xyz 2 2}


do_test tkt3493-2.1 {
  execsql {
    CREATE TABLE t1(a TEXT, b INT);
    INSERT INTO t1 VALUES(123, 456);
  }
} {}
do_test tkt3493-2.2.1 {
  execsql { SELECT a=123 FROM t1 GROUP BY a }
} {1}
do_test tkt3493-2.2.2 {
  execsql { SELECT a=123 FROM t1 }
} {1}
do_test tkt3493-2.2.3 {
  execsql { SELECT a='123' FROM t1 }
} {1}
do_test tkt3493-2.2.4 {
  execsql { SELECT count(*), a=123 FROM t1 }
} {1 1}
do_test tkt3493-2.2.5 {
  execsql { SELECT count(*), +a=123 FROM t1 }
} {1 0}
do_test tkt3493-2.3.3 {
  execsql { SELECT b='456' FROM t1 GROUP BY a }
} {1}
do_test tkt3493-2.3.1 {
  execsql { SELECT b='456' FROM t1 GROUP BY b }
} {1}
do_test tkt3493-2.3.2 {
  execsql { SELECT b='456' FROM t1 }
} {1}
do_test tkt3493-2.4.1 {
  execsql { SELECT typeof(a), a FROM t1 GROUP BY a HAVING a=123 }
} {text 123}
do_test tkt3493-2.4.2 {
  execsql { SELECT typeof(a), a FROM t1 GROUP BY b HAVING a=123 }
} {text 123}
do_test tkt3493-2.5.1 {
  execsql { SELECT typeof(b), b FROM t1 GROUP BY a HAVING b='456' }
} {integer 456}
do_test tkt3493-2.5.2 {
  execsql { SELECT typeof(b), b FROM t1 GROUP BY b HAVING b='456' }
} {integer 456}

do_test tkt3493-3.1 {
  execsql {
    CREATE TABLE t2(a COLLATE NOCASE, b COLLATE BINARY);
    INSERT INTO t2 VALUES('aBc', 'DeF');
  }
} {}
do_test tkt3493-3.2.1 {
  execsql { SELECT a='abc' FROM t2 GROUP BY a }
} {1}
do_test tkt3493-3.2.2 {
  execsql { SELECT a='abc' FROM t2 }
} {1}

do_test tkt3493-3.3.1 {
  execsql { SELECT a>b FROM t2 GROUP BY a, b}
} {0}
do_test tkt3493-3.3.2 {
  execsql { SELECT a>b COLLATE BINARY FROM t2 GROUP BY a, b}
} {1}
do_test tkt3493-3.3.3 {
  execsql { SELECT b>a FROM t2 GROUP BY a, b}
} {0}
do_test tkt3493-3.3.4 {
  execsql { SELECT b>a COLLATE NOCASE FROM t2 GROUP BY a, b}
} {1}

finish_test
