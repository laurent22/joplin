# 2011 December 20
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
# files larger than 4GB.
#

if {[file exists skip-big-file]} return
if {$tcl_platform(os)=="Darwin"} return

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix bigfile2

# Create a small database.
#
do_execsql_test 1.1 {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 2);
}

# Pad the file out to 4GB in size. Then clear the file-size field in the
# db header. This will cause SQLite to assume that the first 4GB of pages
# are actually in use and new pages will be appended to the file.
#
db close
if {[catch {fake_big_file 4096 [get_pwd]/test.db} msg]} {
  puts "**** Unable to create a file larger than 4096 MB. *****"
  finish_test
  return
}
hexio_write test.db 28 00000000

do_test 1.2 {
  file size test.db
} [expr 14 + 4096 * (1<<20)]

# Now insert a large row. The overflow pages will be located past the 4GB
# boundary. Then, after opening and closing the database, test that the row
# can be read back in. 
# 
set str [string repeat k 30000]
do_test 1.3 {
  sqlite3 db test.db
  execsql { INSERT INTO t1 VALUES(3, $str) }
  db close
  sqlite3 db test.db
  db one { SELECT b FROM t1 WHERE a = 3 }
} $str

db close
delete_file test.db

finish_test
