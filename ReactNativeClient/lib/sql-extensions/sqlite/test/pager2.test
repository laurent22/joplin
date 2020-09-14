# 2010 June 15
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

set otn 0
testvfs tv -default 1
foreach code [list {
  set s 512
} {
  set s 1024
  set sql { PRAGMA journal_mode = memory }
} {
  set s 1024
  set sql { 
    PRAGMA journal_mode = memory;
    PRAGMA locking_mode = exclusive;
  }
} {
  set s 2048
  tv devchar safe_append
} {
  set s 4096
} {
  set s 4096
  set sql { PRAGMA journal_mode = WAL }
} {
  set s 4096
  set sql { PRAGMA auto_vacuum = 1 }
} {
  set s 8192
  set sql { PRAGMA synchronous = off }
}] {

  incr otn
  set sql ""
  tv devchar {}
  eval $code
  tv sectorsize $s
  
  do_test pager2-1.$otn.0 {
    faultsim_delete_and_reopen
    execsql $sql
    execsql {
      PRAGMA cache_size = 10;
      CREATE TABLE t1(i INTEGER PRIMARY KEY, j blob);
    }
  } {}

  set tn 0
  set lowpoint 0
  foreach x {
    100 x 0 100
  x
    70 22 96 59 96 50 22 56 21 16 37 64 43 40  0 38 22 38 55  0  6   
    43 62 32 93 54 18 13 29 45 66 29 25 61 31 53 82 75 25 96 86 10 69   
     2 29  6 60 80 95 42 82 85 50 68 96 90 39 78 69 87 97 48 74 65 43   
  x
    86 34 26 50 41 85 58 44 89 22  6 51 45 46 58 32 97  6  1 12 32  2   
    69 39 48 71 33 31  5 58 90 43 24 54 12  9 18 57  4 38 91 42 27 45   
    50 38 56 29 10  0 26 37 83  1 78 15 47 30 75 62 46 29 68  5 30  4   
    27 96 33 95 79 75 56 10 29 70 32 75 52 88  5 36 50 57 46 63 88 65   
  x
    44 95 64 20 24 35 69 61 61  2 35 92 42 46 23 98 78  1 38 72 79 35   
    94 37 13 59  5 93 27 58 80 75 58  7 67 13 10 76 84  4  8 70 81 45   
     8 41 98  5 60 26 92 29 91 90  2 62 40  4  5 22 80 15 83 76 52 88   
    29  5 68 73 72  7 54 17 89 32 81 94 51 28 53 71  8 42 54 59 70 79   
  x
  } {
    incr tn
    set now [db one {SELECT count(i) FROM t1}]
    if {$x == "x"} {
      execsql { COMMIT ; BEGIN }
      set lowpoint $now
      do_test pager2.1.$otn.$tn { 
        sqlite3 db2 test.db
        execsql {
          SELECT COALESCE(max(i), 0) FROM t1;
          PRAGMA integrity_check;
        } 
      } [list $lowpoint ok]
      db2 close
    } else {
      if {$now > $x } {
        if { $x>=$lowpoint } {
          execsql "ROLLBACK TO sp_$x"
        } else {
          execsql "DELETE FROM t1 WHERE i>$x"
          set lowpoint $x
        }
      } elseif {$now < $x} {
        for {set k $now} {$k < $x} {incr k} {
          execsql "SAVEPOINT sp_$k"
          execsql { INSERT INTO t1(j) VALUES(randomblob(1500)) }
        }
      }
      do_execsql_test pager2.1.$otn.$tn { 
        SELECT COALESCE(max(i), 0) FROM t1;
        PRAGMA integrity_check;
      } [list $x ok]
    }
  }
}
db close
tv delete


#-------------------------------------------------------------------------
# pager2-2.1: Test a ROLLBACK with journal_mode=off.
# pager2-2.2: Test shrinking the database (auto-vacuum) with 
#             journal_mode=off
#
do_test pager2-2.1 {
  faultsim_delete_and_reopen
  execsql {
    CREATE TABLE t1(a, b);
    PRAGMA journal_mode = off;
    BEGIN;
      INSERT INTO t1 VALUES(1, 2);
    ROLLBACK;
    SELECT * FROM t1;
  }
} {off}
do_test pager2-2.2 {
  faultsim_delete_and_reopen
  execsql {
    PRAGMA auto_vacuum = incremental;
    PRAGMA page_size = 1024;
    PRAGMA journal_mode = off;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(zeroblob(5000), zeroblob(5000));
    DELETE FROM t1;
    PRAGMA incremental_vacuum;
  }
  file size test.db
} {3072}

#-------------------------------------------------------------------------
# Test that shared in-memory databases seem to work.
#
db close
do_test pager2-3.1 {
  forcedelete test.db
  sqlite3_shutdown
  sqlite3_config_uri 1

  sqlite3 db1 {file:test.db?mode=memory&cache=shared}
  sqlite3 db2 {file:test.db?mode=memory&cache=shared}
  sqlite3 db3 test.db

  db1 eval { CREATE TABLE t1(a, b) }
  db2 eval { INSERT INTO t1 VALUES(1, 2) }
  list [catch { db3 eval { INSERT INTO t1 VALUES(3, 4) } } msg] $msg
} {1 {no such table: t1}}

finish_test
