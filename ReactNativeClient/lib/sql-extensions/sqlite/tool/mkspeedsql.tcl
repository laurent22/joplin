# 2008 October 9
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file generates SQL text used for performance testing.
#
# $Id: mkspeedsql.tcl,v 1.1 2008/10/09 17:57:34 drh Exp $
#

# Set a uniform random seed
expr srand(0)

# The number_name procedure below converts its argment (an integer)
# into a string which is the English-language name for that number.
#
# Example:
#
#     puts [number_name 123]   ->  "one hundred twenty three"
#
set ones {zero one two three four five six seven eight nine
          ten eleven twelve thirteen fourteen fifteen sixteen seventeen
          eighteen nineteen}
set tens {{} ten twenty thirty forty fifty sixty seventy eighty ninety}
proc number_name {n} {
  if {$n>=1000} {
    set txt "[number_name [expr {$n/1000}]] thousand"
    set n [expr {$n%1000}]
  } else {
    set txt {}
  }
  if {$n>=100} {
    append txt " [lindex $::ones [expr {$n/100}]] hundred"
    set n [expr {$n%100}]
  }
  if {$n>=20} {
    append txt " [lindex $::tens [expr {$n/10}]]"
    set n [expr {$n%10}]
  }
  if {$n>0} {
    append txt " [lindex $::ones $n]"
  }
  set txt [string trim $txt]
  if {$txt==""} {set txt zero}
  return $txt
}

# Create a database schema.
#
puts {
  PRAGMA page_size=1024;
  PRAGMA cache_size=8192;
  PRAGMA locking_mode=EXCLUSIVE;
  CREATE TABLE t1(a INTEGER, b INTEGER, c TEXT);
  CREATE TABLE t2(a INTEGER, b INTEGER, c TEXT);
  CREATE INDEX i2a ON t2(a);
  CREATE INDEX i2b ON t2(b);
  SELECT name FROM sqlite_master ORDER BY 1;
}


# 50000 INSERTs on an unindexed table
#
set t1c_list {}
puts {BEGIN;}
for {set i 1} {$i<=50000} {incr i} {
  set r [expr {int(rand()*500000)}]
  set x [number_name $r]
  lappend t1c_list $x
  puts "INSERT INTO t1 VALUES($i,$r,'$x');"
}
puts {COMMIT;}

# 50000 INSERTs on an indexed table
#
puts {BEGIN;}
for {set i 1} {$i<=50000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts "INSERT INTO t2 VALUES($i,$r,'[number_name $r]');"
}
puts {COMMIT;}


# 50 SELECTs on an integer comparison.  There is no index so
# a full table scan is required.
#
for {set i 0} {$i<50} {incr i} {
  set lwr [expr {$i*100}]
  set upr [expr {($i+10)*100}]
  puts "SELECT count(*), avg(b) FROM t1 WHERE b>=$lwr AND b<$upr;"
}

# 50 SELECTs on an LIKE comparison.  There is no index so a full
# table scan is required.
#
for {set i 0} {$i<50} {incr i} {
  puts "SELECT count(*), avg(b) FROM t1 WHERE c LIKE '%[number_name $i]%';"
}

# Create indices
#
puts {BEGIN;}
puts {
  CREATE INDEX i1a ON t1(a);
  CREATE INDEX i1b ON t1(b);
  CREATE INDEX i1c ON t1(c);
}
puts {COMMIT;}

# 5000 SELECTs on an integer comparison where the integer is
# indexed.
#
set sql {}
for {set i 0} {$i<5000} {incr i} {
  set lwr [expr {$i*100}]
  set upr [expr {($i+10)*100}]
  puts "SELECT count(*), avg(b) FROM t1 WHERE b>=$lwr AND b<$upr;"
}

# 100000 random SELECTs against rowid.
#
for {set i 1} {$i<=100000} {incr i} {
  set id [expr {int(rand()*50000)+1}]
  puts "SELECT c FROM t1 WHERE rowid=$id;"
}

# 100000 random SELECTs against a unique indexed column.
#
for {set i 1} {$i<=100000} {incr i} {
  set id [expr {int(rand()*50000)+1}]
  puts "SELECT c FROM t1 WHERE a=$id;"
}

# 50000 random SELECTs against an indexed column text column
#
set nt1c [llength $t1c_list]
for {set i 0} {$i<50000} {incr i} {
  set r [expr {int(rand()*$nt1c)}]
  set c [lindex $t1c_list $i]
  puts "SELECT c FROM t1 WHERE c='$c';"
}


# Vacuum
puts {VACUUM;}

# 5000 updates of ranges where the field being compared is indexed.
#
puts {BEGIN;}
for {set i 0} {$i<5000} {incr i} {
  set lwr [expr {$i*2}]
  set upr [expr {($i+1)*2}]
  puts "UPDATE t1 SET b=b*2 WHERE a>=$lwr AND a<$upr;"
}
puts {COMMIT;}

# 50000 single-row updates.  An index is used to find the row quickly.
#
puts {BEGIN;}
for {set i 0} {$i<50000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts "UPDATE t1 SET b=$r WHERE a=$i;"
}
puts {COMMIT;}

# 1 big text update that touches every row in the table.
#
puts {
  UPDATE t1 SET c=a;
}

# Many individual text updates.  Each row in the table is
# touched through an index.
#
puts {BEGIN;}
for {set i 1} {$i<=50000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts "UPDATE t1 SET c='[number_name $r]' WHERE a=$i;"
}
puts {COMMIT;}

# Delete all content in a table.
#
puts {DELETE FROM t1;}

# Copy one table into another
#
puts {INSERT INTO t1 SELECT * FROM t2;}

# Delete all content in a table, one row at a time.
#
puts {DELETE FROM t1 WHERE 1;}

# Refill the table yet again
#
puts {INSERT INTO t1 SELECT * FROM t2;}

# Drop the table and recreate it without its indices.
#
puts {BEGIN;}
puts {
   DROP TABLE t1;
   CREATE TABLE t1(a INTEGER, b INTEGER, c TEXT);
}
puts {COMMIT;}

# Refill the table yet again.  This copy should be faster because
# there are no indices to deal with.
#
puts {INSERT INTO t1 SELECT * FROM t2;}

# Select 20000 rows from the table at random.
#
puts {
  SELECT rowid FROM t1 ORDER BY random() LIMIT 20000;
}

# Delete 20000 random rows from the table.
#
puts {
  DELETE FROM t1 WHERE rowid IN
    (SELECT rowid FROM t1 ORDER BY random() LIMIT 20000);
}
puts {SELECT count(*) FROM t1;}
    
# Delete 20000 more rows at random from the table.
#
puts {
  DELETE FROM t1 WHERE rowid IN
    (SELECT rowid FROM t1 ORDER BY random() LIMIT 20000);
}
puts {SELECT count(*) FROM t1;}
