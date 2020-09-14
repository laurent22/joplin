# 2019 September 18
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
# focus of this script is testing the FTS4 module.
#
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set testprefix fts4record

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

sqlite3_fts3_may_be_corrupt 1

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts4(x);
  INSERT INTO t1 VALUES('terma terma terma termb');
}

do_execsql_test 1.1 {
  SELECT quote(root) FROM t1_segdir
} {
  X'00057465726D6105010203030004016203010500'
}

proc make_record_wrapper {args} { make_fts3record $args }
db func record make_record_wrapper

do_execsql_test 1.2 {
  select quote( 
    record(0,    5, 'terma', 5, 1, 2, 3, 3, 0, 
              4, 1, 'b'    , 3, 1, 5, 0
  ) );
} {
  X'00057465726D6105010203030004016203010500'
}

do_execsql_test 1.3.1 {
  UPDATE t1_segdir SET root = 
    record(0,    5, 'terma', 5, 1, 2, 3, 3, 0, 
              4, 1, 'b'    , 3, 1, 5, 
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0
          );
}

do_catchsql_test 1.3.2 {
  SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'term*'
} {1 {database disk image is malformed}}

do_execsql_test 1.4.1 {
  UPDATE t1_segdir SET root = 
    record(0,    5, 'terma', 5, 1, 2, 3, 3, 0, 
              4, 1, 'b'    , 4, 1, 5, 
              256, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0
          );
}

do_catchsql_test 1.4.2 {
  SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'term*'
} {1 {database disk image is malformed}}

do_execsql_test 1.4.3 {
  SELECT quote(root) FROM t1_segdir
} {
  X'00057465726D610501020303000401620401058002010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010100'
}

do_execsql_test 1.5.1 {
  UPDATE t1_segdir SET root = 
    record(0,    5, 'terma', 5, 1, 2, 3, 3, 0, 
              4, 1, 'b'    , 4, 1, 5, 
              256, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0
          );
}

do_catchsql_test 1.4.2 {
  SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'term*'
} {1 {database disk image is malformed}}

do_execsql_test 1.4.3 {
  SELECT quote(root) FROM t1_segdir
} {
  X'00057465726D610501020303000401620401058002010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010100'
}


do_execsql_test 1.5.1 {
  UPDATE t1_segdir SET root = 
  X'00057465726D61050102030300040162040105FF00010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010100'
}

do_catchsql_test 1.5.2 {
  SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'term*'
} {1 {database disk image is malformed}}

do_catchsql_test 1.5.3 {
  INSERT INTO t1(t1) VALUES('integrity-check');
} {1 {database disk image is malformed}}

finish_test
