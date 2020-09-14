# 2019 May 22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set testprefix fts3corrupt5

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

sqlite3_fts3_may_be_corrupt 1

do_execsql_test 1.0 {
  BEGIN;
    CREATE VIRTUAL TABLE ft USING fts3(a, b, c);
    INSERT INTO ft VALUES('one', 'one', 'one');
  COMMIT;
}

do_execsql_test 1.1 {
  SELECT * FROM ft WHERE ft MATCH 'b:one'
} {one one one}

do_execsql_test 1.2 {
  SELECT quote(root) FROM ft_segdir;
} {X'00036F6E6509010201010201020200'}

breakpoint
foreach {tn val q bCorrupt} {
  1 X'00036F6E650901'                   'b:one'  1
  2 X'00036F6E6509010201010201FFFFFF'   'c:one'  1
  3 X'00036F6E6501'                     'b:one'  1
  4 X'00036F6E650101'                   'b:one'  1
  5 X'00036F6E650100'                   'b:one'  0
} {
  do_execsql_test 1.3.$tn.1 "UPDATE ft_segdir SET root = $val"

  set res {0 {}}
  if {$bCorrupt} { set res {1 {database disk image is malformed}}}
  do_catchsql_test 1.3.$tn.2 {
    SELECT * FROM ft WHERE ft MATCH $q
  } $res
}

finish_test
