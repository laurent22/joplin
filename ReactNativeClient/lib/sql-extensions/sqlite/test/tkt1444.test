# 2005 September 19
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
# This file implements tests to verify that ticket #1444 has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound||!view {
  finish_test
  return 
}

# The use of a VIEW that contained an ORDER BY clause within a UNION ALL
# was causing problems.  See ticket #1444.
#
do_test tkt1444-1.1 {
  execsql {
    CREATE TABLE DemoTable (x INTEGER, TextKey TEXT, DKey Real);
    CREATE INDEX DemoTableIdx ON DemoTable (TextKey);
    INSERT INTO DemoTable VALUES(9,8,7);
    INSERT INTO DemoTable VALUES(1,2,3);
    CREATE VIEW DemoView AS SELECT * FROM DemoTable ORDER BY TextKey;
    SELECT * FROM DemoTable UNION ALL SELECT * FROM DemoView ORDER BY 1;
  }
} {1 2 3.0 1 2 3.0 9 8 7.0 9 8 7.0}
do_test tkt1444-1.2 {
  execsql {
    SELECT * FROM DemoTable UNION ALL SELECT * FROM DemoView;
  }
} {9 8 7.0 1 2 3.0 1 2 3.0 9 8 7.0}
do_test tkt1444-1.3 {
  execsql {
    DROP VIEW DemoView;
    CREATE VIEW DemoView AS SELECT * FROM DemoTable;
    SELECT * FROM DemoTable UNION ALL SELECT * FROM DemoView ORDER BY 1;
  }
} {1 2 3.0 1 2 3.0 9 8 7.0 9 8 7.0}
do_test tkt1444-1.4 {
  execsql {
    SELECT * FROM DemoTable UNION ALL SELECT * FROM DemoView;
  }
} {9 8 7.0 1 2 3.0 9 8 7.0 1 2 3.0}

finish_test
