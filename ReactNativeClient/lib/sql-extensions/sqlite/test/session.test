# 2008 June 23
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file runs all rtree related tests.
#

set testdir [file dirname $argv0]
source $testdir/permutations.test

ifcapable session {
  # First run tests with sqlite3_extended_error_codes() set, then
  # again with it clear.
  run_test_suite session_eec
  run_test_suite session
  run_test_suite session_strm
}

finish_test
