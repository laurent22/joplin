# 2014 Dec 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#

if {![info exists testdir]} {
  set testdir [file join [file dirname [info script]] .. .. .. test]
}
source $testdir/tester.tcl

# Check if the lsm1 extension has been compiled.
if {$::tcl_platform(platform) == "windows"} {
  set lsm1 lsm.dll
} else {
  set lsm1 lsm.so
}

if {[file exists [file join .. $lsm1]]} {
  proc return_if_no_lsm1 {} {}
} else {
  proc return_if_no_lsm1 {} {
    finish_test
    return -code return
  }
  return
}

proc load_lsm1_vtab {db} {
  db enable_load_extension 1
  db eval {SELECT load_extension('../lsm')}
}
