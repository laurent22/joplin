# 2011 January 19
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
# This file implements tests for SQLite library.  The focus of the tests
# in this file is the use of the sqlite_stat4 histogram data on tables
# with many repeated values and only a few distinct values.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !stat4 {
  finish_test
  return
}

set testprefix analyze5

proc eqp {sql {db db}} {
  uplevel execsql [list "EXPLAIN QUERY PLAN $sql"] $db
}

proc alpha {blob} {
  set ret ""
  foreach c [split $blob {}] {
    if {[string is alpha $c]} {append ret $c}
  }
  return $ret
}
db func alpha alpha

db func lindex lindex

unset -nocomplain i t u v w x y z
do_test analyze5-1.0 {
  db eval {CREATE TABLE t1(t,u,v TEXT COLLATE nocase,w,x,y,z)}
  for {set i 0} {$i < 1000} {incr i} {
    set y [expr {$i>=25 && $i<=50}]
    set z [expr {($i>=400) + ($i>=700) + ($i>=875)}]
    set x $z
    set w $z
    set t [expr {$z+0.5}]
    switch $z {
      0 {set u "alpha"; unset x}
      1 {set u "bravo"}
      2 {set u "charlie"}
      3 {set u "delta"; unset w}
    }
    if {$i%2} {set v $u} {set v [string toupper $u]}
    db eval {INSERT INTO t1 VALUES($t,$u,$v,$w,$x,$y,$z)}
  }
  db eval { 
    CREATE INDEX t1t ON t1(t);  -- 0.5, 1.5, 2.5, and 3.5
    CREATE INDEX t1u ON t1(u);  -- text
    CREATE INDEX t1v ON t1(v);  -- mixed case text
    CREATE INDEX t1w ON t1(w);  -- integers 0, 1, 2 and a few NULLs
    CREATE INDEX t1x ON t1(x);  -- integers 1, 2, 3 and many NULLs
    CREATE INDEX t1y ON t1(y);  -- integers 0 and very few 1s
    CREATE INDEX t1z ON t1(z);  -- integers 0, 1, 2, and 3
    ANALYZE;
  }
  db eval {
    SELECT DISTINCT lindex(test_decode(sample),0) 
      FROM sqlite_stat4 WHERE idx='t1u' ORDER BY nlt;
  }
} {alpha bravo charlie delta}

do_test analyze5-1.1 {
  db eval {
    SELECT DISTINCT lower(lindex(test_decode(sample), 0)) 
      FROM sqlite_stat4 WHERE idx='t1v' ORDER BY 1
  }
} {alpha bravo charlie delta}
do_test analyze5-1.2 {
  db eval {SELECT idx, count(*) FROM sqlite_stat4 GROUP BY 1 ORDER BY 1}
} {t1t 8 t1u 8 t1v 8 t1w 8 t1x 8 t1y 9 t1z 8}

# Verify that range queries generate the correct row count estimates
#
foreach {testid where index rows} {
    1  {z>=0 AND z<=0}       t1z  400
    2  {z>=1 AND z<=1}       t1z  300
    3  {z>=2 AND z<=2}       t1z  175
    4  {z>=3 AND z<=3}       t1z  125
    5  {z>=4 AND z<=4}       t1z    1
    6  {z>=-1 AND z<=-1}     t1z    1
    7  {z>1 AND z<3}         t1z  175
    8  {z>0 AND z<100}       t1z  600
    9  {z>=1 AND z<100}      t1z  600
   10  {z>1 AND z<100}       t1z  300
   11  {z>=2 AND z<100}      t1z  300
   12  {z>2 AND z<100}       t1z  125
   13  {z>=3 AND z<100}      t1z  125
   14  {z>3 AND z<100}       t1z    1
   15  {z>=4 AND z<100}      t1z    1
   16  {z>=-100 AND z<=-1}   t1z    1
   17  {z>=-100 AND z<=0}    t1z  400
   18  {z>=-100 AND z<0}     t1z    1
   19  {z>=-100 AND z<=1}    t1z  700
   20  {z>=-100 AND z<2}     t1z  700
   21  {z>=-100 AND z<=2}    t1z  875
   22  {z>=-100 AND z<3}     t1z  875
  
   31  {z>=0.0 AND z<=0.0}   t1z  400
   32  {z>=1.0 AND z<=1.0}   t1z  300
   33  {z>=2.0 AND z<=2.0}   t1z  175
   34  {z>=3.0 AND z<=3.0}   t1z  125
   35  {z>=4.0 AND z<=4.0}   t1z    1
   36  {z>=-1.0 AND z<=-1.0} t1z    1
   37  {z>1.5 AND z<3.0}     t1z  174
   38  {z>0.5 AND z<100}     t1z  599
   39  {z>=1.0 AND z<100}    t1z  600
   40  {z>1.5 AND z<100}     t1z  299
   41  {z>=2.0 AND z<100}    t1z  300
   42  {z>2.1 AND z<100}     t1z  124
   43  {z>=3.0 AND z<100}    t1z  125
   44  {z>3.2 AND z<100}     t1z    1
   45  {z>=4.0 AND z<100}    t1z    1
   46  {z>=-100 AND z<=-1.0} t1z    1
   47  {z>=-100 AND z<=0.0}  t1z  400
   48  {z>=-100 AND z<0.0}   t1z    1
   49  {z>=-100 AND z<=1.0}  t1z  700
   50  {z>=-100 AND z<2.0}   t1z  700
   51  {z>=-100 AND z<=2.0}  t1z  875
   52  {z>=-100 AND z<3.0}   t1z  875
  
  101  {z=-1}                t1z    1
  102  {z=0}                 t1z  400
  103  {z=1}                 t1z  300
  104  {z=2}                 t1z  175
  105  {z=3}                 t1z  125
  106  {z=4}                 t1z    1
  107  {z=-10.0}             t1z    1
  108  {z=0.0}               t1z  400
  109  {z=1.0}               t1z  300
  110  {z=2.0}               t1z  175
  111  {z=3.0}               t1z  125
  112  {z=4.0}               t1z    1
  113  {z=1.5}               t1z    1
  114  {z=2.5}               t1z    1
  
  201  {z IN (-1)}           t1z    1
  202  {z IN (0)}            t1z  400
  203  {z IN (1)}            t1z  300
  204  {z IN (2)}            t1z  175
  205  {z IN (3)}            t1z  125
  206  {z IN (4)}            t1z    1
  207  {z IN (0.5)}          t1z    1
  208  {z IN (0,1)}          t1z  700
  209  {z IN (0,1,2)}        t1z  875
  210  {z IN (0,1,2,3)}      {}   100
  211  {z IN (0,1,2,3,4,5)}  {}   100
  212  {z IN (1,2)}          t1z  475
  213  {z IN (2,3)}          t1z  300
  214  {z=3 OR z=2}          t1z  300
  215  {z IN (-1,3)}         t1z  126
  216  {z=-1 OR z=3}         t1z  126

  300  {y=0}                 t1y  974
  301  {y=1}                 t1y   26
  302  {y=0.1}               t1y    1

  400  {x IS NULL}           t1x  400

} {
  # Verify that the expected index is used with the expected row count
  # No longer valid due to an EXPLAIN QUERY PLAN output format change
  # do_test analyze5-1.${testid}a {
  #   set x [lindex [eqp "SELECT * FROM t1 WHERE $where"] 3]
  #   set idx {}
  #   regexp {INDEX (t1.) } $x all idx
  #   regexp {~([0-9]+) rows} $x all nrow
  #   list $idx $nrow
  # } [list $index $rows]

  # Verify that the same result is achieved regardless of whether or not
  # the index is used
  do_test analyze5-1.${testid}b {
    set w2 [string map {y +y z +z} $where]
    set a1 [db eval "SELECT rowid FROM t1 NOT INDEXED WHERE $w2\
                     ORDER BY +rowid"]
    set a2 [db eval "SELECT rowid FROM t1 WHERE $where ORDER BY +rowid"]
    if {$a1==$a2} {
      set res ok
    } else {
      set res "a1=\[$a1\] a2=\[$a2\]"
    }
    set res
  } {ok}
}

# Increase the number of NULLs in column x
#
db eval {
   UPDATE t1 SET x=NULL;
   UPDATE t1 SET x=rowid
    WHERE rowid IN (SELECT rowid FROM t1 ORDER BY random() LIMIT 5);
   ANALYZE;
}

# Verify that range queries generate the correct row count estimates
#
foreach {testid where index rows} {
  500  {x IS NULL AND u='charlie'}         t1u  17
  501  {x=1 AND u='charlie'}               t1x   1
  502  {x IS NULL}                         t1x 995
  503  {x=1}                               t1x   1
  504  {x IS NOT NULL}                     t1x   2
  505  {+x IS NOT NULL}                     {} 500
  506  {upper(x) IS NOT NULL}               {} 500

} {
  # Verify that the expected index is used with the expected row count
  # No longer valid due to an EXPLAIN QUERY PLAN format change
  # do_test analyze5-1.${testid}a {
  #   set x [lindex [eqp "SELECT * FROM t1 WHERE $where"] 3]
  #   set idx {}
  #   regexp {INDEX (t1.) } $x all idx
  #   regexp {~([0-9]+) rows} $x all nrow
  #   list $idx $nrow
  # } [list $index $rows]

  # Verify that the same result is achieved regardless of whether or not
  # the index is used
  do_test analyze5-1.${testid}b {
    set w2 [string map {y +y z +z} $where]
    set a1 [db eval "SELECT rowid FROM t1 NOT INDEXED WHERE $w2\
                     ORDER BY +rowid"]
    set a2 [db eval "SELECT rowid FROM t1 WHERE $where ORDER BY +rowid"]
    if {$a1==$a2} {
      set res ok
    } else {
      set res "a1=\[$a1\] a2=\[$a2\]"
    }
    set res
  } {ok}
}

finish_test
