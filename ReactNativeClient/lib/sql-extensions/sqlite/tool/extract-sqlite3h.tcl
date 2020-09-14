#!/usr/bin/tclsh
#
# Given an sqlite3.c source file identified by the command-line
# argument, extract the "sqlite3.h" header file that is embedded inside
# the sqlite3.c source file and write it to standard output.
#
if {[llength $argv]!=1} {
  puts stderr "Usage: $argv0 sqlite3.c >sqlite3.h"
  exit 1
}
set in [open [lindex $argv 0] rb]
while {![eof $in]} {
  set line [gets $in]
  if {[string match {* Begin file sqlite3.h *} $line]} break
}
while {![eof $in]} {
  set line [gets $in]
  if {[string match {* End of sqlite3.h *} $line]} break
  puts $line
}
close $in
