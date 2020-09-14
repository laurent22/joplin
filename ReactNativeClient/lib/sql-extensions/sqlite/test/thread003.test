# 2007 September 10
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
#   This file contains tests that attempt to break the pcache module
#   by bombarding it with simultaneous requests from multiple threads.
#     
# $Id: thread003.test,v 1.8 2009/03/26 14:48:07 danielk1977 Exp $

set testdir [file dirname $argv0]

source $testdir/tester.tcl
if {[run_thread_tests]==0} { finish_test ; return }

# Set up a couple of different databases full of pseudo-randomly 
# generated data.
#
do_test thread003.1.1 {
  execsql {
    BEGIN;
    CREATE TABLE t1(a, b, c);
  }
  for {set ii 0} {$ii < 5000} {incr ii} {
    execsql {INSERT INTO t1 VALUES($ii, randomblob(200), randomblob(200))}
  }
  execsql { 
    CREATE INDEX i1 ON t1(a, b); 
    COMMIT;
  }
} {}
do_test thread003.1.2 {
  expr {([file size test.db] / 1024) > 2000}
} {1}
do_test thread003.1.3 {
  db close
  forcedelete test2.db
  sqlite3 db test2.db
} {}
do_test thread003.1.4 {
  execsql {
    BEGIN;
    CREATE TABLE t1(a, b, c);
  }
  for {set ii 0} {$ii < 5000} {incr ii} {
    execsql {INSERT INTO t1 VALUES($ii, randomblob(200), randomblob(200))}
  }
  execsql { 
    CREATE INDEX i1 ON t1(a, b); 
    COMMIT;
  }
} {}
do_test thread003.1.5 {
  expr {([file size test.db] / 1024) > 2000}
} {1}
do_test thread003.1.6 {
  db close
} {}


# This test opens a connection on each of the large (>2MB) database files
# created by the previous block. The connections do not share a cache.
# Both "cache_size" parameters are set to 15, so there is a maximum of
# 30 pages available globally.
#
# Then, in separate threads, the databases are randomly queried over and
# over again. This will force the connections to recycle clean pages from
# each other. If there is a thread-safety problem, a segfault or assertion
# failure may eventually occur.
#
set nSecond 30
puts "Starting thread003.2 (should run for ~$nSecond seconds)"
do_test thread003.2 {
  foreach zFile {test.db test2.db} {
    set SCRIPT [format {
      set iEnd [expr {[clock_seconds] + %d}]
      set ::DB [sqlthread open %s xyzzy]
  
      # Set the cache size to 15 pages per cache. 30 available globally.
      execsql { PRAGMA cache_size = 15 }
  
      while {[clock_seconds] < $iEnd} {
        set iQuery [expr {int(rand()*5000)}]
        execsql " SELECT * FROM t1 WHERE a = $iQuery "
      }
  
      sqlite3_close $::DB
      expr 1
    } $nSecond $zFile]
  
    unset -nocomplain finished($zFile)
    thread_spawn finished($zFile) $thread_procs $SCRIPT
  }
  foreach zFile {test.db test2.db} {
    if {![info exists finished($zFile)]} {
      vwait finished($zFile)
    }
  }
  expr 0
} {0}

# This test is the same as the test above, except that each thread also
# writes to the database. This causes pages to be moved back and forth 
# between the caches internal dirty and clean lists, which is another
# opportunity for a thread-related bug to present itself.
#
set nSecond 30
puts "Starting thread003.3 (should run for ~$nSecond seconds)"
do_test thread003.3 {
  foreach zFile {test.db test2.db} {
    set SCRIPT [format {
      set iStart [clock_seconds]
      set iEnd [expr {[clock_seconds] + %d}]
      set ::DB [sqlthread open %s xyzzy]
  
      # Set the cache size to 15 pages per cache. 30 available globally.
      execsql { PRAGMA cache_size = 15 }
  
      while {[clock_seconds] < $iEnd} {
        set iQuery [expr {int(rand()*5000)}]
        execsql "SELECT * FROM t1 WHERE a = $iQuery"
        execsql "UPDATE t1 SET b = randomblob(200) 
                 WHERE a < $iQuery AND a > $iQuery + 20
        "
      }
  
      sqlite3_close $::DB
      expr 1
    } $nSecond $zFile]
  
    unset -nocomplain finished($zFile)
    thread_spawn finished($zFile) $thread_procs $SCRIPT
  }
  foreach zFile {test.db test2.db} {
    if {![info exists finished($zFile)]} {
      vwait finished($zFile)
    }
  }
  expr 0
} {0}

# In this test case, one thread is continually querying the database.
# The other thread does not have a database connection, but calls
# sqlite3_release_memory() over and over again.
#
set nSecond 30
puts "Starting thread003.4 (should run for ~$nSecond seconds)"
unset -nocomplain finished(1)
unset -nocomplain finished(2)
do_test thread003.4 {
  thread_spawn finished(1) $thread_procs [format {
    set iEnd [expr {[clock_seconds] + %d}]
    set ::DB [sqlthread open test.db xyzzy]

    # Set the cache size to 15 pages per cache. 30 available globally.
    execsql { PRAGMA cache_size = 15 }

    while {[clock_seconds] < $iEnd} {
      set iQuery [expr {int(rand()*5000)}]
      execsql "SELECT * FROM t1 WHERE a = $iQuery"
    }

    sqlite3_close $::DB
    expr 1
  } $nSecond] 
  thread_spawn finished(2) [format {
    set iEnd [expr {[clock_seconds] + %d}]

    while {[clock_seconds] < $iEnd} {
      sqlite3_release_memory 1000
    }
  } $nSecond]
  
  foreach ii {1 2} {
    if {![info exists finished($ii)]} {
      vwait finished($ii)
    }
  }
  expr 0
} {0}

set sqlite_open_file_count 0
finish_test
