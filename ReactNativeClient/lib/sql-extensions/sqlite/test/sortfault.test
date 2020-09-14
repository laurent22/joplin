# 2014 March 25.
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
# Specifically, it tests the effects of fault injection on the sorter
# module (code in vdbesort.c).
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix sortfault
db close
sqlite3_shutdown
sqlite3_config_pmasz 10
sqlite3_initialize
sqlite3 db test.db


do_execsql_test 1.0 {
  PRAGMA cache_size = 5;
}

foreach {tn mmap_limit nWorker tmpstore threadsmode fakeheap lookaside} {
          1          0       0     file multithread    false     false
          2     100000       0     file multithread    false     false
          3     100000       1     file multithread    false     false
          4    2000000       0     file singlethread   false      true
} {
  if {$sqlite_options(threadsafe)} { set threadsmode singlethread }

  db eval "PRAGMA threads=$nWorker"
  sqlite3_config $threadsmode
  if { $lookaside } {
    sqlite3_config_lookaside 100 500
  } else {
    sqlite3_config_lookaside 0 0
  }
  sqlite3_initialize
  sorter_test_fakeheap $fakeheap

  set str [string repeat a 1000]
  puts $threadsmode

  do_faultsim_test 1.$tn -prep {
    sqlite3 db test.db
    sqlite3_test_control SQLITE_TESTCTRL_SORTER_MMAP db $::mmap_limit
    execsql { PRAGMA cache_size = 5 }
  } -body {
    execsql { 
      WITH r(x,y) AS (
          SELECT 1, $::str
          UNION ALL
          SELECT x+1, $::str FROM r
          LIMIT 200
      )
      SELECT count(x), length(y) FROM r GROUP BY (x%5)
    }
  } -test {
    faultsim_test_result {0 {40 1000 40 1000 40 1000 40 1000 40 1000}}
  }

  do_faultsim_test 2.$tn -faults oom* -prep {
    sqlite3 db test.db
    sqlite3_test_control SQLITE_TESTCTRL_SORTER_MMAP db $::mmap_limit
    add_test_utf16bin_collate db
    execsql { PRAGMA cache_size = 5 }
  } -body {
    execsql { 
      WITH r(x,y) AS (
          SELECT 100, $::str
          UNION ALL
          SELECT x-1, $::str FROM r
          LIMIT 100
      )
      SELECT count(x), length(y) FROM r GROUP BY y COLLATE utf16bin, (x%5)
    }
  } -test {
    faultsim_test_result {0 {20 1000 20 1000 20 1000 20 1000 20 1000}}
  }

  if {$mmap_limit > 1000000} {
    set str2 [string repeat $str 10]

    sqlite3_memdebug_vfs_oom_test 0
    sqlite3 db test.db
    sqlite3_test_control SQLITE_TESTCTRL_SORTER_MMAP db $::mmap_limit
    execsql { PRAGMA cache_size = 5 }

    do_faultsim_test 3.$tn -faults oom-trans* -body {
      execsql { 
        WITH r(x,y) AS (
            SELECT 300, $::str2
            UNION ALL
            SELECT x-1, $::str2 FROM r
            LIMIT 300
        )
        SELECT count(x), length(y) FROM r GROUP BY y, (x%5)
      }
    } -test {
      faultsim_test_result {0 {60 10000 60 10000 60 10000 60 10000 60 10000}}
    }

    sqlite3_memdebug_vfs_oom_test 1
  }
}

catch { db close }
sqlite3_shutdown
set t(0) singlethread
set t(1) multithread
set t(2) serialized
sqlite3_config $t($sqlite_options(threadsafe))
sqlite3_config_lookaside 100 500
sqlite3_initialize

#-------------------------------------------------------------------------
#
reset_db
do_execsql_test 4.0 { 
  CREATE TABLE t1(a, b, c); 
  INSERT INTO t1 VALUES(1, 2, 3);
}
do_test 4.1 { 
  for {set i 0} {$i < 256} {incr i} {
    execsql { 
      INSERT INTO t1 SELECT
        ((a<<3) + b) & 2147483647,
        ((b<<3) + c) & 2147483647,
        ((c<<3) + a) & 2147483647
      FROM t1 ORDER BY rowid DESC LIMIT 1;
    }
  }
} {}

faultsim_save_and_close

do_faultsim_test 4.2 -faults oom* -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { CREATE UNIQUE INDEX i1 ON t1(a,b,c) }
} -test {
  faultsim_test_result {0 {}}
}

#-------------------------------------------------------------------------
#
reset_db
set a [string repeat a 500]
set b [string repeat b 500]
set c [string repeat c 500]
do_execsql_test 5.0 { 
  CREATE TABLE t1(a, b, c); 
  INSERT INTO t1 VALUES($a, $b, $c); 
  INSERT INTO t1 VALUES($c, $b, $a); 
}

do_faultsim_test 5.1 -faults oom* -body {
  execsql { SELECT * FROM t1 ORDER BY a }
} -test {
  faultsim_test_result [list 0 [list $::a $::b $::c $::c $::b $::a]]
}

finish_test
