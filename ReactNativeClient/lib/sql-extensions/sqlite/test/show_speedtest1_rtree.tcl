#!/usr/bin/tclsh
#
# This script displays the field of rectangles used by --testset rtree
# of speedtest1.  Run this script as follows:
#
#      rm test.db
#      ./speedtest1 --testset rtree --size 25 test.db
#      sqlite3 --separator ' ' test.db 'SELECT * FROM rt1' >data.txt
#      wish show_speedtest1_rtree.tcl
#
# The filename "data.txt" is hard coded into this script and so that name
# must be used on lines 3 and 4 above.  Elsewhere, different filenames can
# be used.  The --size N parameter can be adjusted as desired.
#
package require Tk
set f [open data.txt rb]
set data [read $f]
close $f
canvas .c
frame .b
button .b.b1 -text X-Y -command refill-xy
button .b.b2 -text X-Z -command refill-xz
button .b.b3 -text Y-Z -command refill-yz
pack .b.b1 .b.b2 .b.b3 -side left
pack .c -side top -fill both -expand 1
pack .b -side top
proc resize_canvas_to_fit {} {
  foreach {x0 y0 x1 y1} [.c bbox all] break
  set w [expr {$x1-$x0}]
  set h [expr {$y1-$y0}]
  .c config -width $w -height $h
}
proc refill-xy {} {
  .c delete all
  foreach {id x0 x1 y0 y1 z0 z1} $::data {
    .c create rectangle $x0 $y0 $x1 $y1
  }
  .c scale all 0 0 0.05 0.05
  resize_canvas_to_fit
}
proc refill-xz {} {
  .c delete all
  foreach {id x0 x1 y0 y1 z0 z1} $::data {
    .c create rectangle $x0 $z0 $x1 $z1
  }
  .c scale all 0 0 0.05 0.05
  resize_canvas_to_fit
}
proc refill-yz {} {
  .c delete all
  foreach {id x0 x1 y0 y1 z0 z1} $::data {
    .c create rectangle $y0 $z0 $y1 $z1
  }
  .c scale all 0 0 0.05 0.05
  resize_canvas_to_fit
}
refill-xy
