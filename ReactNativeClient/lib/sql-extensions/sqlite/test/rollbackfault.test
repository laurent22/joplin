# 2014-11-12
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
# Test that errors encountered during a ROLLBACK operation correctly 
# affect ongoing SQL statements.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix rollbackfault


proc int2hex {i} { format %.2X $i }
db func int2hex int2hex
do_execsql_test 1.0 {
  SELECT int2hex(0), int2hex(100), int2hex(255)
} {00 64 FF}
do_execsql_test 1.1 {
  CREATE TABLE t1(i, h);
  CREATE INDEX i1 ON t1(h);
  WITH data(a, b) AS (
    SELECT 1, int2hex(1)
      UNION ALL
    SELECT a+1, int2hex(a+1) FROM data WHERE a<40
  )
  INSERT INTO t1 SELECT * FROM data;
} {}

foreach f {oom ioerr} {
  do_faultsim_test 1.2 -faults $f* -prep {
    set sql1 { SELECT i FROM t1 WHERE (i%2)==0 }
    set sql2 { SELECT i FROM t1 WHERE (i%2)==0 ORDER BY h }
    set ::s1 [sqlite3_prepare db $sql1 -1 dummy]
    set ::s2 [sqlite3_prepare db $sql2 -1 dummy]
  
    for {set i 0} {$i < 10} {incr i} { sqlite3_step $::s1 }
    for {set i 0} {$i < 3}  {incr i} { sqlite3_step $::s2 }
  
    execsql {
      BEGIN; DELETE FROM t1 WHERE (i%2)
    }
  } -body {
    execsql { ROLLBACK }
  } -test {
  
    set res1 [list]
    set res2 [list]
    while {"SQLITE_ROW" == [sqlite3_step $::s1]} {
      lappend res1 [sqlite3_column_text $::s1 0]
    }
    while {"SQLITE_ROW" == [sqlite3_step $::s2]} {
      lappend res2 [sqlite3_column_text $::s2 0]
    }
    set rc1 [sqlite3_finalize $::s1]
    set rc2 [sqlite3_finalize $::s2]
  
    catchsql { ROLLBACK }
  
    if {$rc1=="SQLITE_OK" && $rc2=="SQLITE_OK" 
     && $res1=="22 24 26 28 30 32 34 36 38 40"
     && $res2=="8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40"
    } {
      # This is Ok.
    } elseif {$rc1!="SQLITE_OK" && $rc2!="SQLITE_OK" && $res1=="" &&$res2==""} {
      # Also Ok.
    } else {
      error "statements don't look right"
    }
  }
}


finish_test
