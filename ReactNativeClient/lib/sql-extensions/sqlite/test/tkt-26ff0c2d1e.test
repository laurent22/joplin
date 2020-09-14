# 2010 May 12
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
# focus of this script testing a bug found in the OP_Variable optimizer
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test bug-20100512-1 {
  set DB [sqlite3_connection_pointer db]
  set SQL {SELECT case when 1 then 99 else ? end + ?}
  set STMT [sqlite3_prepare_v2 $DB $SQL -1 TAIL]
  set TAIL
} {}
do_test bug-20100512-2 {
  sqlite3_bind_parameter_count $STMT
} 2
do_test bug-20100512-3 {
  sqlite3_bind_int $STMT 1 123
  sqlite3_bind_int $STMT 2 456
  sqlite3_step $STMT
  sqlite3_column_int $STMT 0
} {555}
sqlite3_finalize $STMT

finish_test
