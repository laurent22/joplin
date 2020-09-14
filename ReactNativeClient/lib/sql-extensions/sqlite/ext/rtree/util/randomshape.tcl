#!/usr/bin/tclsh
#
# This script generates a cluster of random polygons that are useful
# for testing the geopoly extension.
#
# Usage:
#
#    tclsh randomshape.tcl | tee x.sql | sqlite3 >x.html
#
# The output files are x.sql and x.html.  Run the above multiple times
# until an interesting "x.html" file is found, then use the "x.sql" inputs
# to construct test cases.
#
proc randomenclosure {cx cy p1 p2 p3 p4} {
  set r 0
  set pi 3.145926
  set pi2 [expr {$pi*2}]
  set x0 [expr {$cx + rand()*$p3 + $p4}]
  set ans "\[\[$x0,$cy\]"
  while {1} {
    set r [expr {$r+$p1+$p2*rand()}]
    if {$r>=$pi2} break
    set m [expr {rand()*$p3 + $p4}]
    set x [expr {$cx+$m*cos($r)}]
    set y [expr {$cy+$m*sin($r)}]
    append ans ",\[$x,$y\]"
  }
  append ans ",\[$x0,$cy\]\]"
  return $ans
}
proc randomshape1 {} {
  set cx [expr {100+int(rand()*800)}]
  set cy [expr {100+int(rand()*600)}]
  set p1 [expr {rand()*0.1}]
  set p2 [expr {rand()*0.5+0.5}]
  set p3 [expr {rand()*100+25}]
  set p4 [expr {rand()*25}]
  return [randomenclosure $cx $cy $p1 $p2 $p3 $p4]
}
proc randomshape1_sm {} {
  set cx [expr {100+int(rand()*800)}]
  set cy [expr {100+int(rand()*600)}]
  set p1 [expr {rand()*0.1}]
  set p2 [expr {rand()*0.5+0.5}]
  set p3 [expr {rand()*10+25}]
  set p4 [expr {rand()*5}]
  return [randomenclosure $cx $cy $p1 $p2 $p3 $p4]
}
proc randomshape2 {} {
  set cx [expr {400+int(rand()*200)}]
  set cy [expr {300+int(rand()*200)}]
  set p1 [expr {rand()*0.05}]
  set p2 [expr {rand()*0.5+0.5}]
  set p3 [expr {rand()*50+200}]
  set p4 [expr {rand()*50+100}]
  return [randomenclosure $cx $cy $p1 $p2 $p3 $p4]
}
proc randomcolor {} {
  set n [expr {int(rand()*5)}]
  return [lindex {red orange green blue purple} $n]
}

puts {.print '<html>'}
puts {.print '<svg width="1000" height="800" style="border:1px solid black">'}
puts {CREATE TABLE t1(poly,clr);}
puts {CREATE TABLE t2(poly,clr);}
for {set i 0} {$i<30} {incr i} {
  puts "INSERT INTO t1(rowid,poly,clr)"
  puts " VALUES($i,'[randomshape1]','[randomcolor]');"
}
for {set i 30} {$i<80} {incr i} {
  puts "INSERT INTO t1(rowid,poly,clr)"
  puts " VALUES($i,'[randomshape1_sm]','[randomcolor]');"
}
for {set i 100} {$i<105} {incr i} {
  puts "INSERT INTO t2(rowid,poly,clr)"
  puts " VALUES($i,'[randomshape2]','[randomcolor]');"
}

puts {DELETE FROM t1 WHERE geopoly_json(poly) IS NULL;}
puts {SELECT geopoly_svg(poly,
   printf('style="fill:none;stroke:%s;stroke-width:1;"',clr))
  FROM t1;}
puts {SELECT geopoly_svg(poly,
   printf('style="fill:none;stroke:%s;stroke-width:2;"',clr))
  FROM t2;}
puts {.print '<svg>'}
