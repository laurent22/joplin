# 2017-07-15
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
# focus of this file is the "swarmvtab" extension
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix swarmvtab2
do_not_use_codec

ifcapable !vtab {
  finish_test
  return
}


db close
foreach name [glob -nocomplain test*.db] {
  forcedelete $name
}
sqlite3 db test.db
load_static_extension db unionvtab
proc create_database {filename} {
  sqlite3 dbx $filename
  set num [regsub -all {[^0-9]+} $filename {}]
  set num [string trimleft $num 0]
  set start [expr {$num*1000}]
  set end [expr {$start+999}]
  dbx eval {
    CREATE TABLE t2(a INTEGER PRIMARY KEY,b);
    WITH RECURSIVE c(x) AS (
      VALUES($start) UNION ALL SELECT x+1 FROM c WHERE x<$end
    )
    INSERT INTO t2(a,b) SELECT x, printf('**%05d**',x) FROM c;
  }
  dbx close
}
db func create_database create_database
do_execsql_test 100 {
  CREATE TABLE t1(filename, tablename, istart, iend);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<99)
  INSERT INTO t1 SELECT printf('test%03d.db',x),'t2',x*1000,x*1000+999 FROM c;
  CREATE VIRTUAL TABLE temp.v1 USING swarmvtab(
    'SELECT * FROM t1', 'create_database'
  );
} {}
do_execsql_test 110 {
  SELECT b FROM v1 WHERE a=3875;
} {**03875**}
do_test 120 {
  lsort [glob -nocomplain test?*.db]
} {test001.db test003.db}
do_execsql_test 130 {
  SELECT b FROM v1 WHERE a BETWEEN 3999 AND 4000 ORDER BY a;
} {**03999** **04000**}
do_test 140 {
  lsort [glob -nocomplain test?*.db]
} {test001.db test003.db test004.db}
do_execsql_test 150 {
  SELECT b FROM v1 WHERE a>=99998;
} {**99998** **99999**}
do_test 160 {
  lsort -dictionary [glob -nocomplain test?*.db]
} {test001.db test003.db test004.db test099.db}

finish_test
