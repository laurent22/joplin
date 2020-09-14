# Run this TCL script using "testfixture" to get a report that shows
# the sequence of database pages used by a particular table or index.
# This information is used for fragmentation analysis.
#

# Get the name of the database to analyze
#

if {[llength $argv]!=2} {
  puts stderr "Usage: $argv0 database-name table-or-index-name"
  exit 1
}
set file_to_analyze [lindex $argv 0]
if {![file exists $file_to_analyze]} {
  puts stderr "No such file: $file_to_analyze"
  exit 1
}
if {![file readable $file_to_analyze]} {
  puts stderr "File is not readable: $file_to_analyze"
  exit 1
}
if {[file size $file_to_analyze]<512} {
  puts stderr "Empty or malformed database: $file_to_analyze"
  exit 1
}
set objname [lindex $argv 1]

# Open the database
#
sqlite3 db [lindex $argv 0]
set DB [btree_open [lindex $argv 0] 1000 0]

# This proc is a wrapper around the btree_cursor_info command. The
# second argument is an open btree cursor returned by [btree_cursor].
# The first argument is the name of an array variable that exists in
# the scope of the caller. If the third argument is non-zero, then
# info is returned for the page that lies $up entries upwards in the
# tree-structure. (i.e. $up==1 returns the parent page, $up==2 the 
# grandparent etc.)
#
# The following entries in that array are filled in with information retrieved
# using [btree_cursor_info]:
#
#   $arrayvar(page_no)             =  The page number
#   $arrayvar(entry_no)            =  The entry number
#   $arrayvar(page_entries)        =  Total number of entries on this page
#   $arrayvar(cell_size)           =  Cell size (local payload + header)
#   $arrayvar(page_freebytes)      =  Number of free bytes on this page
#   $arrayvar(page_freeblocks)     =  Number of free blocks on the page
#   $arrayvar(payload_bytes)       =  Total payload size (local + overflow)
#   $arrayvar(header_bytes)        =  Header size in bytes
#   $arrayvar(local_payload_bytes) =  Local payload size
#   $arrayvar(parent)              =  Parent page number
# 
proc cursor_info {arrayvar csr {up 0}} {
  upvar $arrayvar a
  foreach [list a(page_no) \
                a(entry_no) \
                a(page_entries) \
                a(cell_size) \
                a(page_freebytes) \
                a(page_freeblocks) \
                a(payload_bytes) \
                a(header_bytes) \
                a(local_payload_bytes) \
                a(parent) \
                a(first_ovfl) ] [btree_cursor_info $csr $up] break
}

# Determine the page-size of the database. This global variable is used
# throughout the script.
#
set pageSize [db eval {PRAGMA page_size}]

# Find the root page of table or index to be analyzed.  Also find out
# if the object is a table or an index.
#
if {$objname=="sqlite_master"} {
  set rootpage 1
  set type table
} else {
  db eval {
    SELECT rootpage, type FROM sqlite_master
     WHERE name=$objname
  } break
  if {![info exists rootpage]} {
    puts stderr "no such table or index: $objname"
    exit 1
  }
  if {$type!="table" && $type!="index"} {
    puts stderr "$objname is something other than a table or index"
    exit 1
  }
  if {![string is integer -strict $rootpage]} {
    puts stderr "invalid root page for $objname: $rootpage"
    exit 1
  } 
}

# The cursor $csr is pointing to an entry.  Print out information
# about the page that $up levels above that page that contains
# the entry.  If $up==0 use the page that contains the entry.
# 
# If information about the page has been printed already, then
# this is a no-op.
# 
proc page_info {csr up} {
  global seen
  cursor_info ci $csr $up
  set pg $ci(page_no)
  if {[info exists seen($pg)]} return
  set seen($pg) 1

  # Do parent pages first
  #
  if {$ci(parent)} {
    page_info $csr [expr {$up+1}]
  }

  # Find the depth of this page
  #
  set depth 1
  set i $up
  while {$ci(parent)} {
    incr i
    incr depth
    cursor_info ci $csr $i
  }

  # print the results
  #
  puts [format {LEVEL %d:  %6d} $depth $pg]
}  

  
  

# Loop through the object and print out page numbers
#
set csr [btree_cursor $DB $rootpage 0]
for {btree_first $csr} {![btree_eof $csr]} {btree_next $csr} {
  page_info $csr 0
  set i 1
  foreach pg [btree_ovfl_info $DB $csr] {
    puts [format {OVFL %3d: %6d} $i $pg]
    incr i
  }
}
exit 0
