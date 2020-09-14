# 2010 October 27
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Test that the FTS3 extension does not crash when it encounters a
# corrupt data structure on disk.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 { finish_test ; return }

set ::testprefix fts3corrupt3

#-------------------------------------------------------------------------
# Test that fts3 does not choke on an oversized varint.
#
do_execsql_test 1.0 {
  PRAGMA page_size = 512;
  CREATE VIRTUAL TABLE t1 USING fts3;
  BEGIN;
    INSERT INTO t1 VALUES('one');
    INSERT INTO t1 VALUES('one');
    INSERT INTO t1 VALUES('one');
  COMMIT;
}
do_execsql_test 1.1 {
  SELECT quote(root) from t1_segdir;
} {X'00036F6E6509010200010200010200'}
sqlite3_db_config db DEFENSIVE 0
do_execsql_test 1.2 {
  UPDATE t1_segdir SET root = X'00036F6E650EFFFFFFFFFFFFFFFFFFFFFFFF0200';
}
do_catchsql_test 1.3 {
  SELECT rowid FROM t1 WHERE t1 MATCH 'one'
} {0 -1}

#-------------------------------------------------------------------------
# Interior node with the prefix or suffix count of an entry set to a
# negative value.
#
set doc1 [string repeat "x " 600]
set doc2 [string repeat "y " 600]
set doc3 [string repeat "z " 600]

do_execsql_test 2.0 {
  CREATE VIRTUAL TABLE t2 USING fts3;
  BEGIN;
    INSERT INTO t2 VALUES($doc1);
    INSERT INTO t2 VALUES($doc2);
    INSERT INTO t2 VALUES($doc3);
  COMMIT;
}
do_execsql_test 2.1 {
  SELECT quote(root) from t2_segdir;
} {X'0101017900017A'}



finish_test
