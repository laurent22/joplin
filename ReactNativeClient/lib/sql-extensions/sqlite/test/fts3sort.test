# 2011 May 04
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}


proc build_database {nRow param} {
  db close
  forcedelete test.db
  sqlite3 db test.db

  set vocab [list    aa ab ac   ba bb bc    ca cb cc   da]
  expr srand(0)

  execsql "CREATE VIRTUAL TABLE t1 USING fts4($param)"
  for {set i 0} {$i < $nRow} {incr i} {
    set v [expr int(rand()*1000000)]
    set doc [list]
    for {set div 1} {$div < 1000000} {set div [expr $div*10]} {
      lappend doc [lindex $vocab [expr ($v/$div) % 10]]
    }
    execsql { INSERT INTO t1 VALUES($doc) }
  }
}

set testprefix fts3sort

unset -nocomplain CONTROL
foreach {t param} {
  1     ""
  2     "order=asc"
  3     "order=desc"
} {

  set testprefix fts3sort-1.$t

  set nRow 1000
  do_test 1.0 {
    build_database $nRow $param
    execsql { SELECT count(*) FROM t1 }
  } $nRow
  
  foreach {tn query} {
  1   "SELECT docid, * FROM t1"
  2   "SELECT docid, * FROM t1 WHERE t1 MATCH 'aa'"
  3   "SELECT docid, * FROM t1 WHERE t1 MATCH 'a*'"
  4   "SELECT docid, quote(matchinfo(t1)) FROM t1 WHERE t1 MATCH 'a*'"
  5   "SELECT docid, quote(matchinfo(t1,'pcnxals')) FROM t1 WHERE t1 MATCH 'b*'"
  6   "SELECT docid, * FROM t1 WHERE t1 MATCH 'a* b* c*'"
  7   "SELECT docid, * FROM t1 WHERE t1 MATCH 'aa OR da'"
  8   "SELECT docid, * FROM t1 WHERE t1 MATCH 'nosuchtoken'"
  9   "SELECT docid, snippet(t1) FROM t1 WHERE t1 MATCH 'aa OR da'"
  10  "SELECT docid, snippet(t1) FROM t1 WHERE t1 MATCH 'aa OR nosuchtoken'"
  11  "SELECT docid, snippet(t1) FROM t1 WHERE t1 MATCH 'aa NEAR bb'"
  12  "SELECT docid, snippet(t1) FROM t1 WHERE t1 MATCH '\"aa bb\"'"
  13  "SELECT docid, content FROM t1 WHERE t1 MATCH 'aa NEAR/2 bb NEAR/3 cc'"
  14  "SELECT docid, content FROM t1 WHERE t1 MATCH '\"aa bb cc\"'"
  } {
  
    unset -nocomplain A B C D
    set A_list [list]
    set B_list [list]
    set C_list [list]
    set D_list [list]
  
    unset -nocomplain X
    db eval "$query ORDER BY rowid ASC"  X  { 
      set A($X(docid)) [array get X] 
      lappend A_list $X(docid)
    }
    unset -nocomplain X
    db eval "$query ORDER BY rowid DESC" X  { 
      set B($X(docid)) [array get X] 
      lappend B_list $X(docid)
    }
    unset -nocomplain X
    db eval "$query ORDER BY docid ASC"  X  { 
      set C($X(docid)) [array get X] 
      lappend C_list $X(docid)
    }
    unset -nocomplain X
    db eval "$query ORDER BY docid DESC" X  { 
      set D($X(docid)) [array get X] 
      lappend D_list $X(docid)
    }
  
    do_test $tn.1 { set A_list } [lsort -integer -increasing $A_list]
    do_test $tn.2 { set B_list } [lsort -integer -decreasing $B_list]
    do_test $tn.3 { set C_list } [lsort -integer -increasing $C_list]
    do_test $tn.4 { set D_list } [lsort -integer -decreasing $D_list]
  
    unset -nocomplain DATA
    unset -nocomplain X
    db eval "$query" X  { 
      set DATA($X(docid)) [array get X] 
    }
  
    do_test $tn.5 { lsort [array get A] } [lsort [array get DATA]]
    do_test $tn.6 { lsort [array get B] } [lsort [array get DATA]]
    do_test $tn.7 { lsort [array get C] } [lsort [array get DATA]]
    do_test $tn.8 { lsort [array get D] } [lsort [array get DATA]]

    if {[info exists CONTROL($tn)]} {
      do_test $tn.9 { set CONTROL($tn) } [lsort [array get DATA]]
    } else {
      set CONTROL($tn) [lsort [array get DATA]]
    }
  }
}
unset -nocomplain CONTROL

set testprefix fts3sort

#-------------------------------------------------------------------------
# Tests for parsing the "order=asc" and "order=desc" directives.
#
foreach {tn param res} {
  1 "order=asc"             {0 {}}
  2 "order=desc"            {0 {}}
  3 "order=dec"             {1 {unrecognized order: dec}}
  4 "order=xxx, order=asc"  {1 {unrecognized order: xxx}}
  5 "order=desc, order=asc" {0 {}}
  6 "order=xxxx, order=asc" {1 {unrecognized order: xxxx}}
  7 "order=desk"            {1 {unrecognized order: desk}}
} {
  execsql { DROP TABLE IF EXISTS t1 }
  do_catchsql_test 2.1.$tn "
    CREATE VIRTUAL TABLE t1 USING fts4(a, b, $param)
  " $res
}

do_execsql_test 2.2 {
  BEGIN;
    CREATE VIRTUAL TABLE t2 USING fts4(order=desc);
    INSERT INTO t2 VALUES('aa bb');
    INSERT INTO t2 VALUES('bb cc');
    INSERT INTO t2 VALUES('cc aa');
    SELECT docid FROM t2 WHERE t2 MATCH 'aa';
  END;
} {3 1}
do_execsql_test 2.3 {
  SELECT docid FROM t2 WHERE t2 MATCH 'aa';
} {3 1}
do_execsql_test 2.4 {
  SELECT docid FROM t2 WHERE t2 MATCH 'aa' ORDER BY content;
} {1 3}

#-------------------------------------------------------------------------
# Test that ticket [56be976859] has been fixed.
#
do_execsql_test 3.1 {
  CREATE VIRTUAL TABLE t3 USING fts4(x, order=DESC);
  INSERT INTO t3(docid, x) VALUES(113382409004785664, 'aa');
  INSERT INTO t3(docid, x) VALUES(1, 'ab');
  SELECT rowid FROM t3 WHERE x MATCH 'a*' ORDER BY docid DESC;
} {113382409004785664 1}
do_execsql_test 3.2 {
  CREATE VIRTUAL TABLE t4 USING fts4(x);
  INSERT INTO t4(docid, x) VALUES(-113382409004785664, 'aa');
  INSERT INTO t4(docid, x) VALUES(1, 'ab');
  SELECT rowid FROM t4 WHERE x MATCH 'a*';
} {-113382409004785664 1}



finish_test
