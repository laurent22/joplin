# 2005 November 26
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
# This file implements tests to verify that ticket #1537 is
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt1537-1.1 {
  execsql {
    CREATE TABLE t1(id, a1, a2);
    INSERT INTO t1 VALUES(1, NULL, NULL);
    INSERT INTO t1 VALUES(2, 1, 3);
    CREATE TABLE t2(id, b);
    INSERT INTO t2 VALUES(3, 1);
    INSERT INTO t2 VALUES(4, NULL);
    SELECT * FROM t1 LEFT JOIN t2 ON a1=b OR a2=+b;
  }
} {1 {} {} {} {} 2 1 3 3 1}
do_test tkt1537-1.2 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON a1=b OR a2=b;
  }
} {1 {} {} {} {} 2 1 3 3 1}
do_test tkt1537-1.3 {
  execsql {
    SELECT * FROM t2 LEFT JOIN t1 ON a1=b OR a2=b;
  }
} {3 1 2 1 3 4 {} {} {} {}}
ifcapable subquery {
  do_test tkt1537-1.4 {
    execsql {
      SELECT * FROM t1 LEFT JOIN t2 ON b IN (a1,a2);
    }
  } {1 {} {} {} {} 2 1 3 3 1}
  do_test tkt1537-1.5 {
    execsql {
      SELECT * FROM t2 LEFT JOIN t1 ON b IN (a2,a1);
    }
  } {3 1 2 1 3 4 {} {} {} {}}
}
do_test tkt1537-1.6 {
  execsql {
    CREATE INDEX t1a1 ON t1(a1);
    CREATE INDEX t1a2 ON t1(a2);
    CREATE INDEX t2b ON t2(b);
    SELECT * FROM t1 LEFT JOIN t2 ON a1=b OR a2=b;
  }
} {1 {} {} {} {} 2 1 3 3 1}
do_test tkt1537-1.7 {
  execsql {
    SELECT * FROM t2 LEFT JOIN t1 ON a1=b OR a2=b;
  }
} {3 1 2 1 3 4 {} {} {} {}}

ifcapable subquery {
  do_test tkt1537-1.8 {
    execsql {
      SELECT * FROM t1 LEFT JOIN t2 ON b IN (a1,a2);
    }
  } {1 {} {} {} {} 2 1 3 3 1}
  do_test tkt1537-1.9 {
    execsql {
      SELECT * FROM t2 LEFT JOIN t1 ON b IN (a2,a1);
    }
  } {3 1 2 1 3 4 {} {} {} {}}
}

execsql {
  DROP INDEX t1a1;
  DROP INDEX t1a2;
  DROP INDEX t2b;
}

do_test tkt1537-2.1 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b BETWEEN a1 AND a2;
  }
} {1 {} {} {} {} 2 1 3 3 1}
do_test tkt1537-2.2 {
  execsql {
    CREATE INDEX t2b ON t2(b);
    SELECT * FROM t1 LEFT JOIN t2 ON b BETWEEN a1 AND a2;
  }
} {1 {} {} {} {} 2 1 3 3 1}
do_test tkt1537-2.3 {
  execsql {
    SELECT * FROM t2 LEFT JOIN t1 ON b BETWEEN a1 AND a2;
  }
} {3 1 2 1 3 4 {} {} {} {}}
do_test tkt1537-2.4 {
  execsql {
    CREATE INDEX t1a1 ON t1(a1);
    CREATE INDEX t1a2 ON t1(a2);
    SELECT * FROM t2 LEFT JOIN t1 ON b BETWEEN a1 AND a2;
  }
} {3 1 2 1 3 4 {} {} {} {}}

do_test tkt1537-3.1 {
  execsql {
    SELECT * FROM t1 LEFT JOIN t2 ON b GLOB 'abc*' WHERE t1.id=1;
  }
} {1 {} {} {} {}}
do_test tkt1537-3.2 {
  execsql { 
    SELECT * FROM t2 LEFT JOIN t1 ON a1 GLOB 'abc*' WHERE t2.id=3;
  }
} {3 1 {} {} {}}


finish_test
