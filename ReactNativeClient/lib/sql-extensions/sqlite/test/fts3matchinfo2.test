# 2020-05-14
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for the FTS3 module. The focus
# of this file is tables created with the "matchinfo=fts3" option.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 { finish_test ; return }

set sqlite_fts3_enable_parentheses 1

# Crash case found by cyg0810 at gmail.com 2020-05-14.  Reported to
# chromium (which is not vulnerable) who kindly referred it to us.
#
do_execsql_test 1.0 {
  CREATE TABLE t_content(col0 INTEGER);
  CREATE VIRTUAL TABLE t0 USING fts3(col0 INTEGER PRIMARY KEY,col1 VARCHAR(8),col2 BINARY,col3 BINARY);
  INSERT INTO t0 VALUES (1, '1234','aaaa','bbbb');
  SELECT hex(matchinfo(t0,'yxy'))  FROM t0 WHERE t0 MATCH  x'2b0a312b0a312a312a2a0b5d0a0b0b0a312a0a0b0b0a312a0b310a392a0b0a27312a2a0b5d0a312a0b310a31315d0b310a312a316d2a0b313b15bceaa50a312a0b0a27312a2a0b5d0a312a0b310a312b0b2a310a312a0b2a0b2a0b2e5d0a0bff313336e34a2a312a0b0a3c310b0a0b4b4b0b4b2a4bec40322b2a0b310a0a312a0a0a0a0a0a0a0a0a0b310a312a2a2a0b5d0a0b0b0a312a0b310a312a0b0a4e4541530b310a5df5ced70a0a0a0a0a4f520a0a0a0a0a0a0a312a0b0a4e4541520b310a5d616161610a0a0a0a4f520a0a0a0a0a0a312b0a312a312a0a0a0a0a0a0a004a0b0a310b220a0b0a310a4a22310a0b0a7e6fe0e0e030e0e0e0e0e01176e02000e0e0e0e0e01131320226310a0b0a310a4a22310a0b0a310a766f8b8b4ee0e0300ae0090909090909090909090909090909090909090909090909090909090909090947aaaa540b09090909090909090909090909090909090909090909090909090909090909fae0e0f2f22164e0e0f273e07fefefef7d6dfafafafa6d6d6d6d';
} {/000000.*0000000/}


set sqlite_fts3_enable_parentheses 0
finish_test
