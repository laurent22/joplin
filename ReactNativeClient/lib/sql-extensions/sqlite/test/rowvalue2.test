# 2016 June 17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the SELECT statement.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix rowvalue2

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(0, 0, 0);
  INSERT INTO t1 VALUES(0, 1, 1);
  INSERT INTO t1 VALUES(1, 0, 2);
  INSERT INTO t1 VALUES(1, 1, 3);

  CREATE INDEX i1 ON t1(a, b);
}

do_execsql_test 1.1.1 { SELECT c FROM t1 WHERE (a, b) >= (1, 0) } {2 3} 
do_execsql_test 1.1.2 { SELECT c FROM t1 WHERE (a, b) > (1, 0)  } {3}

#-------------------------------------------------------------------------

do_execsql_test 2.0.1 {
  CREATE TABLE t2(a INTEGER, b INTEGER, c INTEGER, d INTEGER);
  CREATE INDEX i2 ON t2(a, b, c);
}
do_test 2.0.2 {
  foreach a {0 1 2 3} {
  foreach b {0 1 2 3} {
  foreach c {0 1 2 3} {
    execsql { INSERT INTO t2 VALUES($a, $b, $c, $c + $b*4 + $a*16); }
  }}}
} {}

do_execsql_test 2.1 {
  SELECT d FROM t2 WHERE (a, b) > (2, 2);
} [db eval { SELECT d FROM t2 WHERE a>2 OR (a=2 AND b>2) }]

do_execsql_test 2.2 {
  SELECT d FROM t2 WHERE (a, b) >= (2, 2);
} [db eval { SELECT d FROM t2 WHERE a>2 OR (a=2 AND b>=2) }]

do_execsql_test 2.3 {
  SELECT d FROM t2 WHERE a=1 AND (b, c) >= (1, 2);
} [db eval { SELECT d FROM t2 WHERE +a=1 AND (b>1 OR (b==1 AND c>=2)) }]

do_execsql_test 2.4 {
  SELECT d FROM t2 WHERE a=1 AND (b, c) > (1, 2);
} [db eval { SELECT d FROM t2 WHERE +a=1 AND (b>1 OR (b==1 AND c>2)) }]

#-------------------------------------------------------------------------

set words {
airfare airfield airfields airflow airfoil
airfoils airframe airframes airily airing
airings airless airlift airlifts airline
airliner airlines airlock airlocks airmail
airmails airman airmen airplane airplanes

arraignment arraignments arraigns arrange arranged
arrangement arrangements arranger arrangers arranges
arranging arrant array arrayed arrays
arrears arrest arrested arrester arresters
arresting arrestingly arrestor arrestors arrests

edifices edit edited editing edition
editions editor editorial editorially editorials
editors edits educable educate educated
educates educating education educational educationally
educations educator educators eel eelgrass
}

do_test 3.0 {
  execsql { CREATE TABLE t3(a, b, c, w); }
  foreach w $words {
    set a [string range $w 0 2]
    set b [string range $w 3 5]
    set c [string range $w 6 end]
    execsql { INSERT INTO t3 VALUES($a, $b, $c, $w) }
  }
} {}


foreach {tn idx} {
  IDX1 {}
  IDX2 { CREATE INDEX i3 ON t3(a, b, c); }
  IDX3 { CREATE INDEX i3 ON t3(a, b); }
  IDX4 { CREATE INDEX i3 ON t3(a); }
} {
  execsql { DROP INDEX IF EXISTS i3 }
  execsql $idx

  foreach w $words {
    set a [string range $w 0 2]
    set b [string range $w 3 5]
    set c [string range $w 6 end]

    foreach op [list > >= < <= == IS] {
      do_execsql_test 3.1.$tn.$w.$op [subst -novar {
        SELECT rowid FROM t3 WHERE (a, b, c) [set op] ($a, $b, $c) 
        ORDER BY +rowid
      }] [db eval [subst -novar {
        SELECT rowid FROM t3 WHERE w [set op] $w ORDER BY +rowid
      }]]

      do_execsql_test 3.1.$tn.$w.$op.subselect [subst -novar {
        SELECT rowid FROM t3 WHERE (a, b, c) [set op] (
          SELECT a, b, c FROM t3 WHERE w = $w
        )
        ORDER BY +rowid
      }] [db eval [subst -novar {
        SELECT rowid FROM t3 WHERE w [set op] $w ORDER BY +rowid
      }]]
    }

  }
}

#-------------------------------------------------------------------------
#

do_execsql_test 4.0 {
  CREATE TABLE t4(a, b, c);
  INSERT INTO t4 VALUES(NULL, NULL, NULL);
  INSERT INTO t4 VALUES(NULL, NULL, 0);
  INSERT INTO t4 VALUES(NULL, NULL, 1);
  INSERT INTO t4 VALUES(NULL,    0, NULL);
  INSERT INTO t4 VALUES(NULL,    0, 0);
  INSERT INTO t4 VALUES(NULL,    0, 1);
  INSERT INTO t4 VALUES(NULL,    1, NULL);
  INSERT INTO t4 VALUES(NULL,    1, 0);
  INSERT INTO t4 VALUES(NULL,    1, 1);

  INSERT INTO t4 VALUES(   0, NULL, NULL);
  INSERT INTO t4 VALUES(   0, NULL, 0);
  INSERT INTO t4 VALUES(   0, NULL, 1);
  INSERT INTO t4 VALUES(   0,    0, NULL);
  INSERT INTO t4 VALUES(   0,    0, 0);
  INSERT INTO t4 VALUES(   0,    0, 1);
  INSERT INTO t4 VALUES(   0,    1, NULL);
  INSERT INTO t4 VALUES(   0,    1, 0);
  INSERT INTO t4 VALUES(   0,    1, 1);

  INSERT INTO t4 VALUES(   1, NULL, NULL);
  INSERT INTO t4 VALUES(   1, NULL, 0);
  INSERT INTO t4 VALUES(   1, NULL, 1);
  INSERT INTO t4 VALUES(   1,    0, NULL);
  INSERT INTO t4 VALUES(   1,    0, 0);
  INSERT INTO t4 VALUES(   1,    0, 1);
  INSERT INTO t4 VALUES(   1,    1, NULL);
  INSERT INTO t4 VALUES(   1,    1, 0);
  INSERT INTO t4 VALUES(   1,    1, 1);
}

proc make_expr1 {cList vList op} {
  return "([join $cList ,]) $op ([join $vList ,])"
}

proc make_expr3 {cList vList op} {
  set n [llength $cList]

  set aList [list]
  foreach c [lrange $cList 0 end-1] v [lrange $vList 0 end-1] {
    lappend aList "$c == $v"
  }
  lappend aList "[lindex $cList end] $op [lindex $vList end]"

  return "([join $aList { AND }])"
}

proc make_expr2 {cList vList op} {
  set ret ""

  switch -- $op {
    == - IS {
      set aList [list]
      foreach c $cList v $vList { lappend aList "($c $op $v)" }
      set ret [join $aList " AND "]
    }

    < - > {
      set oList [list]
      for {set i 0} {$i < [llength $cList]} {incr i} {
        lappend oList [make_expr3 [lrange $cList 0 $i] [lrange $vList 0 $i] $op]
      }
      set ret [join $oList " OR "]
    }

    <= - >= {
      set o2 [string range $op 0 0]
      set oList [list]
      for {set i 0} {$i < [llength $cList]-1} {incr i} {
        lappend oList [make_expr3 [lrange $cList 0 $i] [lrange $vList 0 $i] $o2]
      }
      lappend oList [make_expr3 $cList $vList $op]
      set ret [join $oList " OR "]
    }


    default {
      error "Unknown op: $op"
    }
  }

  set ret
}

foreach {tn idx} {
  IDX1 {}
  IDX2 { CREATE INDEX i4 ON t4(a, b, c); }
  IDX3 { CREATE INDEX i4 ON t4(a, b); }
  IDX4 { CREATE INDEX i4 ON t4(a); }
} {
  execsql { DROP INDEX IF EXISTS i4 }
  execsql $idx

  foreach {tn2 vector} {
    1 {0 0 0}
    2 {1 1 1}
    3 {0 0 NULL}
    4 {0 NULL 0}
    5 {NULL 0 0}
    6 {1 1 NULL}
    7 {1 NULL 1}
    8 {NULL 1 1}
  } {
    foreach op { IS == < <= > >= } {
      set e1 [make_expr1 {a b c} $vector $op]
      set e2 [make_expr2 {a b c} $vector $op]

      do_execsql_test 4.$tn.$tn2.$op \
          "SELECT rowid FROM t4 WHERE $e2 ORDER BY +rowid" [
          db eval "SELECT rowid FROM t4 WHERE $e1 ORDER BY +rowid"
      ]
    }
  }
}

do_execsql_test 5.0 {
  CREATE TABLE r1(a TEXT, iB TEXT);
  CREATE TABLE r2(x TEXT, zY INTEGER);
  CREATE INDEX r1ab ON r1(a, iB);

  INSERT INTO r1 VALUES(35, 35);
  INSERT INTO r2 VALUES(35, 36);
  INSERT INTO r2 VALUES(35, 4);
  INSERT INTO r2 VALUES(35, 35);
} {}

foreach {tn lhs rhs} {
  1 {x +zY} {a iB}
  2 {x  zY} {a iB}
  3 {x  zY} {a +iB}
  4 {+x  zY} {a iB}
  5 {x  zY} {+a iB}
} {
  foreach op { IS == < <= > >= } {
    set e1 [make_expr1 $lhs $rhs $op]
    set e2 [make_expr2 $lhs $rhs $op]
    do_execsql_test 5.$tn.$op \
      "SELECT * FROM r1, r2 WHERE $e2 ORDER BY iB" [db eval \
      "SELECT * FROM r1, r2 WHERE $e1 ORDER BY iB"
    ]
  }
}


finish_test
