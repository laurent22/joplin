# 2006 January 30
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
# This file implements tests to verify that ticket #1644 is
# fixed.  Ticket #1644 complains that precompiled statements
# are not expired correctly as a result of changes to TEMP
# views and triggers.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !tempdb||!view {
  finish_test
  return
}  

# Create two tables T1 and T2 and make V1 point to T1.
do_test tkt1644-1.1 {
  execsql {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(1);
    CREATE TABLE t2(b);
    INSERT INTO t2 VALUES(99);
    CREATE TEMP VIEW v1 AS SELECT * FROM t1;
    SELECT * FROM v1;
  }
} {1}

# The "SELECT * FROM v1" should be in the TCL interface cache below.
# It will continue to point to T1 unless the cache is invalidated when
# the view changes.
#
do_test tkt1644-1.2 {
  execsql {
    DROP VIEW v1;
    CREATE TEMP VIEW v1 AS SELECT * FROM t2;
    SELECT * FROM v1;
  }
} {99}

# Cache an access to the T1 table.
#
do_test tkt1644-1.3 {
  execsql {
    SELECT * FROM t1;
  }
} {1}

# Create a temp table T1.  Make sure the cache is invalidated so that
# the statement is recompiled and refers to the empty temp table.
#
do_test tkt1644-1.4 {
  execsql {
    CREATE TEMP TABLE t1(x);
  }
  execsql {
    SELECT * FROM t1;
  }
} {}

ifcapable view {
  do_test tkt1644-2.1 {
    execsql {
      CREATE TEMP TABLE temp_t1(a, b);
    }
    set ::DB [sqlite3_connection_pointer db]
    set ::STMT [sqlite3_prepare $::DB "SELECT * FROM temp_t1" -1 DUMMY]
    execsql {
      DROP TABLE temp_t1;
    }
    list [sqlite3_step $::STMT] [sqlite3_finalize $::STMT]
  } {SQLITE_ERROR SQLITE_SCHEMA}
  
  do_test tkt1644-2.2 {
    execsql {
      CREATE TABLE real_t1(a, b);
      CREATE TEMP VIEW temp_v1 AS SELECT * FROM real_t1;
    }
    set ::DB [sqlite3_connection_pointer db]
    set ::STMT [sqlite3_prepare $::DB "SELECT * FROM temp_v1" -1 DUMMY]
    execsql {
      DROP VIEW temp_v1;
    }
    list [sqlite3_step $::STMT] [sqlite3_finalize $::STMT]
  } {SQLITE_ERROR SQLITE_SCHEMA}

  do_test tkt1644-2.3 {
    execsql {
      CREATE TEMP VIEW temp_v1 AS SELECT * FROM real_t1 LIMIT 10 OFFSET 10;
    }
    set ::DB [sqlite3_connection_pointer db]
    set ::STMT [sqlite3_prepare $::DB "SELECT * FROM temp_v1" -1 DUMMY]
    execsql {
      DROP VIEW temp_v1;
    }
    list [sqlite3_step $::STMT] [sqlite3_finalize $::STMT]
  } {SQLITE_ERROR SQLITE_SCHEMA}
}


finish_test
