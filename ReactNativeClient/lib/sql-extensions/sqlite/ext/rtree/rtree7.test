# 2010 February 16
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
# Test that nothing goes wrong if an rtree table is created, then the
# database page-size is modified. At one point (3.6.22), this was causing
# malfunctions.
#

if {![info exists testdir]} {
  set testdir [file join [file dirname [info script]] .. .. test]
} 
source [file join [file dirname [info script]] rtree_util.tcl]
source $testdir/tester.tcl

ifcapable !rtree||!vacuum {
  finish_test
  return
}

# Like execsql except display output as integer where that can be
# done without loss of information.
#
proc execsql_intout {sql} {
  set out {}
  foreach term [execsql $sql] {
    regsub {\.0$} $term {} term
    lappend out $term
  }
  return $out
}

do_test rtree7-1.1 {
  execsql {
    PRAGMA page_size = 1024;
    CREATE VIRTUAL TABLE rt USING rtree(id, x1, x2, y1, y2);
    INSERT INTO rt VALUES(1, 1, 2, 3, 4);
  }
} {}
do_test rtree7-1.2 {
  execsql_intout { SELECT * FROM rt }
} {1 1 2 3 4}
do_test rtree7-1.3 {
  execsql_intout { 
    PRAGMA page_size = 2048;
    VACUUM;
    SELECT * FROM rt;
  }
} {1 1 2 3 4}
do_test rtree7-1.4 {
  for {set i 2} {$i <= 51} {incr i} {
    execsql { INSERT INTO rt VALUES($i, 1, 2, 3, 4) }
  }
  execsql_intout { SELECT sum(x1), sum(x2), sum(y1), sum(y2) FROM rt }
} {51 102 153 204}
do_test rtree7-1.5 {
  execsql_intout { 
    PRAGMA page_size = 512;
    VACUUM;
    SELECT sum(x1), sum(x2), sum(y1), sum(y2) FROM rt
  }
} {51 102 153 204}

do_rtree_integrity_test rtree7-1.6 rt

finish_test
