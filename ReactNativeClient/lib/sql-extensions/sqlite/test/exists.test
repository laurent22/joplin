# 2011 April 9
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
# focus of this file is testing the various schema modification statements
# that feature "IF EXISTS" or "IF NOT EXISTS" clauses.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl


foreach jm {rollback wal} {
  if {![wal_is_capable] && $jm=="wal"} continue

  set testprefix exists-$jm

  # This block of tests is targeted at CREATE XXX IF NOT EXISTS statements.
  #
  do_multiclient_test tn {

    # TABLE objects.
    #
    do_test 1.$tn.1.1 {
      if {$jm == "wal"} { sql2 { PRAGMA journal_mode = WAL } }
      sql2 { CREATE TABLE t1(x) }
      sql1 { CREATE TABLE IF NOT EXISTS t1(a, b) }
      sql2 { DROP TABLE t1 }
      sql1 { CREATE TABLE IF NOT EXISTS t1(a, b) }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'table' }
    } {t1}

    do_test 1.$tn.1.2 {
      sql2 { CREATE TABLE t2(x) }
      sql1 { CREATE TABLE IF NOT EXISTS t2 AS SELECT * FROM t1 }
      sql2 { DROP TABLE t2 }
      sql1 { CREATE TABLE IF NOT EXISTS t2 AS SELECT * FROM t1 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'table' }
    } {t1 t2}


    # INDEX objects.
    #
    do_test 1.$tn.2 {
      sql2 { CREATE INDEX i1 ON t1(a) }
      sql1 { CREATE INDEX IF NOT EXISTS i1 ON t1(a, b) }
      sql2 { DROP INDEX i1 }
      sql1 { CREATE INDEX IF NOT EXISTS i1 ON t1(a, b) }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'index' }
    } {i1}

    # VIEW objects.
    #
    do_test 1.$tn.3 {
      sql2 { CREATE VIEW v1 AS SELECT * FROM t1 }
      sql1 { CREATE VIEW IF NOT EXISTS v1 AS SELECT * FROM t1 }
      sql2 { DROP VIEW v1 }
      sql1 { CREATE VIEW IF NOT EXISTS v1 AS SELECT * FROM t1 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'view' }
    } {v1}

    # TRIGGER objects.
    #
    do_test $tn.4 {
      sql2 { CREATE TRIGGER tr1 AFTER INSERT ON t1 BEGIN SELECT 1; END }
  sql1 { CREATE TRIGGER IF NOT EXISTS tr1 AFTER INSERT ON t1 BEGIN SELECT 1; END }
      sql2 { DROP TRIGGER tr1 }
  sql1 { CREATE TRIGGER IF NOT EXISTS tr1 AFTER INSERT ON t1 BEGIN SELECT 1; END }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'trigger' }
    } {tr1}
  }

  # This block of tests is targeted at DROP XXX IF EXISTS statements.
  #
  do_multiclient_test tn {

    # TABLE objects.
    #
    do_test 2.$tn.1 {
      if {$jm == "wal"} { sql1 { PRAGMA journal_mode = WAL } }
      sql1 { DROP TABLE IF EXISTS t1 }
      sql2 { CREATE TABLE t1(x) }
      sql1 { DROP TABLE IF EXISTS t1 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'table' }
    } {}

    # INDEX objects.
    #
    do_test 2.$tn.2 {
      sql1 { CREATE TABLE t2(x) }
      sql1 { DROP INDEX IF EXISTS i2 }
      sql2 { CREATE INDEX i2 ON t2(x) }
      sql1 { DROP INDEX IF EXISTS i2 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'index' }
    } {}

    # VIEW objects.
    #
    do_test 2.$tn.3 {
      sql1 { DROP VIEW IF EXISTS v1 }
      sql2 { CREATE VIEW v1 AS SELECT * FROM t2 }
      sql1 { DROP VIEW IF EXISTS v1 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'view' }
    } {}

    # TRIGGER objects.
    #
    do_test 2.$tn.4 {
      sql1 { DROP TRIGGER IF EXISTS tr1 }
      sql2 { CREATE TRIGGER tr1 AFTER INSERT ON t2 BEGIN SELECT 1; END }
      sql1 { DROP TRIGGER IF EXISTS tr1 }
      sql2 { SELECT name FROM sqlite_master WHERE type = 'trigger' }
    } {}
  }

  # This block of tests is targeted at DROP XXX IF EXISTS statements with
  # attached databases.
  #
  do_multiclient_test tn {

    forcedelete test.db2
    do_test 3.$tn.0 {
      sql1 { ATTACH 'test.db2' AS aux }
      sql2 { ATTACH 'test.db2' AS aux }
    } {}

    # TABLE objects.
    #
    do_test 3.$tn.1.1 {
      sql1 { DROP TABLE IF EXISTS aux.t1 }
      sql2 { CREATE TABLE aux.t1(x) }
      sql1 { DROP TABLE IF EXISTS aux.t1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'table' }
    } {}
    do_test 3.$tn.1.2 {
      sql1 { DROP TABLE IF EXISTS t1 }
      sql2 { CREATE TABLE aux.t1(x) }
      sql1 { DROP TABLE IF EXISTS t1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'table' }
    } {}

    # INDEX objects.
    #
    do_test 3.$tn.2.1 {
      sql1 { CREATE TABLE aux.t2(x) }
      sql1 { DROP INDEX IF EXISTS aux.i2 }
      sql2 { CREATE INDEX aux.i2 ON t2(x) }
      sql1 { DROP INDEX IF EXISTS aux.i2 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'index' }
    } {}
    do_test 3.$tn.2.2 {
      sql1 { DROP INDEX IF EXISTS i2 }
      sql2 { CREATE INDEX aux.i2 ON t2(x) }
      sql1 { DROP INDEX IF EXISTS i2 }
      sql2 { SELECT * FROM aux.sqlite_master WHERE type = 'index' }
    } {}

    # VIEW objects.
    #
    do_test 3.$tn.3.1 {
      sql1 { DROP VIEW IF EXISTS aux.v1 }
      sql2 { CREATE VIEW aux.v1 AS SELECT * FROM t2 }
      sql1 { DROP VIEW IF EXISTS aux.v1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'view' }
    } {}
    do_test 3.$tn.3.2 {
      sql1 { DROP VIEW IF EXISTS v1 }
      sql2 { CREATE VIEW aux.v1 AS SELECT * FROM t2 }
      sql1 { DROP VIEW IF EXISTS v1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'view' }
    } {}

    # TRIGGER objects.
    #
    do_test 3.$tn.4.1 {
      sql1 { DROP TRIGGER IF EXISTS aux.tr1 }
      sql2 { CREATE TRIGGER aux.tr1 AFTER INSERT ON t2 BEGIN SELECT 1; END }
      sql1 { DROP TRIGGER IF EXISTS aux.tr1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'trigger' }
    } {}
    do_test 3.$tn.4.2 {
      sql1 { DROP TRIGGER IF EXISTS tr1 }
      sql2 { CREATE TRIGGER aux.tr1 AFTER INSERT ON t2 BEGIN SELECT 1; END }
      sql1 { DROP TRIGGER IF EXISTS tr1 }
      sql2 { SELECT name FROM aux.sqlite_master WHERE type = 'trigger' }
    } {}
  }
}


finish_test
