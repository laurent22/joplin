# 2007 May 17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library. The 
# focus of this script is testing that the overflow-page related
# enhancements added after version 3.3.17 speed things up.
#
# $Id: speed3.test,v 1.6 2009/07/09 02:48:24 shane Exp $
#

#---------------------------------------------------------------------
# Test plan:
#
# If auto-vacuum is enabled for the database, the following cases
# should show performance improvement with respect to 3.3.17.
#
#   + When deleting rows that span overflow pages. This is faster
#     because the overflow pages no longer need to be read before
#     they can be moved to the free list (test cases speed3-1.X). 
#
#   + When reading a column value stored on an overflow page that
#     is not the first overflow page for the row. The improvement
#     in this case is because the overflow pages between the tree
#     page and the overflow page containing the value do not have
#     to be read (test cases speed3-2.X).
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !tclvar||!attach {
  finish_test
  return
}

speed_trial_init speed1

# Set a uniform random seed
expr srand(0)

set ::NROW 1000

# The number_name procedure below converts its argment (an integer)
# into a string which is the English-language name for that number.
#
# Example:
#
#     puts [number_name 123]   ->  "one hundred twenty three"
#
set ones {zero one two three four five six seven eight nine
          ten eleven twelve thirteen fourteen fifteen sixteen seventeen
          eighteen nineteen}
set tens {{} ten twenty thirty forty fifty sixty seventy eighty ninety}
proc number_name {n} {
  if {$n>=1000} {
    set txt "[number_name [expr {$n/1000}]] thousand"
    set n [expr {$n%1000}]
  } else {
    set txt {}
  }
  if {$n>=100} {
    append txt " [lindex $::ones [expr {$n/100}]] hundred"
    set n [expr {$n%100}]
  }
  if {$n>=20} {
    append txt " [lindex $::tens [expr {$n/10}]]"
    set n [expr {$n%10}]
  }
  if {$n>0} {
    append txt " [lindex $::ones $n]"
  }
  set txt [string trim $txt]
  if {$txt==""} {set txt zero}
  return $txt
}

proc populate_t1 {db} {
  $db transaction {
    for {set ii 0} {$ii < $::NROW} {incr ii} {
      set N [number_name $ii]
      set repeats [expr {(10000/[string length $N])+1}]
      set text [string range [string repeat $N $repeats] 0 10000]
      $db eval {INSERT INTO main.t1 VALUES($ii, $text, $ii)}
    }
    $db eval {INSERT INTO aux.t1 SELECT * FROM main.t1}
  }
}


proc io_log {db} {
  db_enter db
  array set stats1 [btree_pager_stats [btree_from_db db]]
  array set stats2 [btree_pager_stats [btree_from_db db 2]]
  db_leave db
# puts "1: [array get stats1]"
# puts "2: [array get stats2]"
  puts "Incrvacuum: Read $stats1(read), wrote $stats1(write)"
  puts "Normal    : Read $stats2(read), wrote $stats2(write)"
}

proc speed3_reset_db {} {
  db close
  sqlite3 db test.db
  db eval { 
    PRAGMA main.cache_size = 200000;
    PRAGMA main.auto_vacuum = 'incremental';
    ATTACH 'test2.db' AS 'aux'; 
    PRAGMA aux.auto_vacuum = 'none';
  }
}

forcedelete test2.db test2.db-journal
speed3_reset_db

# Set up a database in auto-vacuum mode and create a database schema.
#
do_test speed3-0.1 {
  execsql {
    CREATE TABLE main.t1(a INTEGER, b TEXT, c INTEGER);
  }
  execsql {
    SELECT name FROM sqlite_master ORDER BY 1;
  }
} {t1}
do_test speed3-0.2 {
  execsql {
    CREATE TABLE aux.t1(a INTEGER, b TEXT, c INTEGER);
  }
  execsql {
    SELECT name FROM aux.sqlite_master ORDER BY 1;
  }
} {t1}
do_test speed3-0.3 {
  populate_t1 db
  execsql {
    SELECT count(*) FROM main.t1;
    SELECT count(*) FROM aux.t1;
  }
} "$::NROW $::NROW"
do_test speed3-0.4 {
  execsql {
    PRAGMA main.auto_vacuum;
    PRAGMA aux.auto_vacuum;
  }
} {2 0}

# Delete all content in a table, one row at a time.
#
#io_log db
speed3_reset_db
speed_trial speed3-1.incrvacuum $::NROW row {DELETE FROM main.t1 WHERE 1}
speed_trial speed3-1.normal     $::NROW row {DELETE FROM aux.t1 WHERE 1}
io_log db

# Select the "C" column (located at the far end of the overflow 
# chain) from each table row.
#
#db eval {PRAGMA incremental_vacuum(500000)}
populate_t1 db
speed3_reset_db
speed_trial speed3-2.incrvacuum $::NROW row {SELECT c FROM main.t1}
speed_trial speed3-2.normal     $::NROW row {SELECT c FROM aux.t1}
io_log db

finish_test
