# 2015-03-25
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
# The focus of this script is making multiple calls to saveCursorPosition()
# and restoreCursorPosition() when cursors have eState==CURSOR_SKIPNEXT
# 

set testdir [file dirname $argv0]
source $testdir/tester.tcl

load_static_extension db eval
do_execsql_test btree02-100 {
  CREATE TABLE t1(a TEXT, ax INTEGER, b INT, PRIMARY KEY(a,ax)) WITHOUT ROWID;
  WITH RECURSIVE c(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM c WHERE i<10)
    INSERT INTO t1(a,ax,b) SELECT printf('%02x',i+160), random(), i FROM c;
  CREATE INDEX t1a ON t1(a);
  CREATE TABLE t2(x,y);
  CREATE TABLE t3(cnt);
  WITH RECURSIVE c(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM c WHERE i<4)
    INSERT INTO t3(cnt) SELECT i FROM c;
  SELECT count(*) FROM t1;
} {10}

proc showt1 {} {
  puts -nonewline "t1: "
  puts [db eval {SELECT printf('(%s,%s)',quote(a),quote(b)) FROM t1}]
}

do_test btree02-110 {
  db eval BEGIN
  set i 0
  # showt1
  db eval {SELECT a, ax, b, cnt FROM t1 CROSS JOIN t3 WHERE b IS NOT NULL} {
    if {$a==""} continue
    db eval {INSERT INTO t2(x,y) VALUES($b,$cnt)}
    # puts "a,b,cnt = ($a,$b,$cnt)"
    incr i
    if {$i%2==1} {
      set bx [expr {$b+1000}]
      #  puts "INSERT ($a),$bx"
      db eval {INSERT INTO t1(a,ax,b) VALUES(printf('(%s)',$a),random(),$bx)}
      # showt1
    } else {
      # puts "DELETE a=$a"
      db eval {DELETE FROM t1 WHERE a=$a}
      # showt1
    }
    db eval {COMMIT; BEGIN}
  }  
  db one {COMMIT; SELECT count(*) FROM t1;}
} {10}

finish_test
