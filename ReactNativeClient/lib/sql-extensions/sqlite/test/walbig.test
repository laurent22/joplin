# 2010 July 07
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
# focus of this script testing the ability of SQLite to handle database
# files larger than 4GB in WAL mode.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !wal {
  finish_test
  return
}

# Do not use a codec for this file, as the database is manipulated using
# external methods (the [fake_big_file] and [hexio_write] commands).
#
do_not_use_codec

# If SQLITE_DISABLE_LFS is defined, omit this file.
ifcapable !lfs {
  finish_test
  return
}

set a_string_counter 1
proc a_string {n} {
  incr ::a_string_counter
  string range [string repeat "${::a_string_counter}." $n] 1 $n
}
db func a_string a_string

do_test walbig-1.0 {
  execsql {
    PRAGMA journal_mode = WAL;
    CREATE TABLE t1(a PRIMARY KEY, b UNIQUE);
    INSERT INTO t1 VALUES(a_string(300), a_string(500));
    INSERT INTO t1 SELECT a_string(300), a_string(500) FROM t1;
    INSERT INTO t1 SELECT a_string(300), a_string(500) FROM t1;
    INSERT INTO t1 SELECT a_string(300), a_string(500) FROM t1;
  }
} {wal}

db close
if {[catch {fake_big_file 5000 [get_pwd]/test.db}]} {
  puts "**** Unable to create a file larger than 5000 MB. *****"
  finish_test
  return
}
hexio_write test.db 28 00000000

sqlite3 db test.db
db func a_string a_string
do_test walbig-1.1 {
  execsql { INSERT INTO t1 SELECT a_string(300), a_string(500) FROM t1 }
} {}
db close

sqlite3 db test.db
do_test walbig-1.2 {
  execsql { SELECT a FROM t1 ORDER BY a }
} [lsort [execsql { SELECT a FROM t1 ORDER BY rowid }]]

do_test walbig-1.3 {
  execsql { SELECT b FROM t1 ORDER BY b }
} [lsort [execsql { SELECT b FROM t1 ORDER BY rowid }]]

finish_test
