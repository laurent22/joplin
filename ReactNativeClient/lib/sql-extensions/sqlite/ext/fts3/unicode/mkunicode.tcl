
source [file join [file dirname [info script]] parseunicode.tcl]

proc print_rd {map} {
  global tl_lookup_table
  set aChar [list]
  set lRange [list]

  set nRange 1
  set iFirst  [lindex $map 0 0]
  set cPrev   [lindex $map 0 1]
  set fPrev   [lindex $map 0 2]

  foreach m [lrange $map 1 end] {
    foreach {i c f} $m {}

    if {$cPrev == $c && $fPrev==$f} {
      for {set j [expr $iFirst+$nRange]} {$j<$i} {incr j} {
        if {[info exists tl_lookup_table($j)]==0} break
      }

      if {$j==$i} {
        set nNew [expr {(1 + $i - $iFirst)}]
        if {$nNew<=8} {
          set nRange $nNew
          continue
        }
      }
    }

    lappend lRange [list $iFirst $nRange]
    lappend aChar  $cPrev
    lappend aFlag  $fPrev

    set iFirst $i
    set cPrev  $c
    set fPrev  $f
    set nRange 1
  }
  lappend lRange [list $iFirst $nRange]
  lappend aChar $cPrev
  lappend aFlag $fPrev

  puts "/*"
  puts "** If the argument is a codepoint corresponding to a lowercase letter"
  puts "** in the ASCII range with a diacritic added, return the codepoint"
  puts "** of the ASCII letter only. For example, if passed 235 - \"LATIN"
  puts "** SMALL LETTER E WITH DIAERESIS\" - return 65 (\"LATIN SMALL LETTER"
  puts "** E\"). The resuls of passing a codepoint that corresponds to an"
  puts "** uppercase letter are undefined."
  puts "*/"
  puts "static int ${::remove_diacritic}(int c, int bComplex)\{"
  puts "  unsigned short aDia\[\] = \{"
  puts -nonewline "        0, "
  set i 1
  foreach r $lRange {
    foreach {iCode nRange} $r {}
    if {($i % 8)==0} {puts "" ; puts -nonewline "    " }
    incr i

    puts -nonewline [format "%5d" [expr ($iCode<<3) + $nRange-1]]
    puts -nonewline ", "
  }
  puts ""
  puts "  \};"
  puts "#define HIBIT ((unsigned char)0x80)"
  puts "  unsigned char aChar\[\] = \{"
  puts -nonewline "    '\\0',      "
  set i 1
  foreach c $aChar f $aFlag {
    if { $f } {
      set str "'$c'|HIBIT, "
    } else {
      set str "'$c',       "
    }
    if {$c == ""} { set str "'\\0',      " }

    if {($i % 6)==0} {puts "" ; puts -nonewline "    " }
    incr i
    puts -nonewline "$str"
  }
  puts ""
  puts "  \};"
  puts {
  unsigned int key = (((unsigned int)c)<<3) | 0x00000007;
  int iRes = 0;
  int iHi = sizeof(aDia)/sizeof(aDia[0]) - 1;
  int iLo = 0;
  while( iHi>=iLo ){
    int iTest = (iHi + iLo) / 2;
    if( key >= aDia[iTest] ){
      iRes = iTest;
      iLo = iTest+1;
    }else{
      iHi = iTest-1;
    }
  }
  assert( key>=aDia[iRes] );
  if( bComplex==0 && (aChar[iRes] & 0x80) ) return c;
  return (c > (aDia[iRes]>>3) + (aDia[iRes]&0x07)) ? c : ((int)aChar[iRes] & 0x7F);}
  puts "\}"
}

proc print_isdiacritic {zFunc map} {

  set lCode [list]
  foreach m $map {
    foreach {code char flag} $m {}
    if {$flag} continue
    if {$code && $char == ""} { lappend lCode $code }
  }
  set lCode [lsort -integer $lCode]
  set iFirst [lindex $lCode 0]
  set iLast [lindex $lCode end]

  set i1 0
  set i2 0

  foreach c $lCode {
    set i [expr $c - $iFirst]
    if {$i < 32} {
      set i1 [expr {$i1 | (1<<$i)}]
    } else {
      set i2 [expr {$i2 | (1<<($i-32))}]
    }
  }

  puts "/*"
  puts "** Return true if the argument interpreted as a unicode codepoint" 
  puts "** is a diacritical modifier character."
  puts "*/"
  puts "int ${zFunc}\(int c)\{"
  puts "  unsigned int mask0 = [format "0x%08X" $i1];"
  puts "  unsigned int mask1 = [format "0x%08X" $i2];"

  puts "  if( c<$iFirst || c>$iLast ) return 0;"
  puts "  return (c < $iFirst+32) ?"
  puts "      (mask0 & ((unsigned int)1 << (c-$iFirst))) :"
  puts "      (mask1 & ((unsigned int)1 << (c-$iFirst-32)));"
  puts "\}"
}


#-------------------------------------------------------------------------

proc an_load_separator_ranges {} {
  global unicodedata.txt
  set lSep [an_load_unicodedata_text ${unicodedata.txt}]
  unset -nocomplain iFirst 
  unset -nocomplain nRange 
  set lRange [list]
  foreach sep $lSep {
    if {0==[info exists iFirst]} {
      set iFirst $sep
      set nRange 1
    } elseif { $sep == ($iFirst+$nRange) } {
      incr nRange
    } else {
      lappend lRange [list $iFirst $nRange]
      set iFirst $sep
      set nRange 1
    }
  } 
  lappend lRange [list $iFirst $nRange]
  set lRange
}

proc an_print_range_array {lRange} {
  set iFirstMax 0
  set nRangeMax 0
  foreach range $lRange {
    foreach {iFirst nRange} $range {}
    if {$iFirst > $iFirstMax} {set iFirstMax $iFirst}
    if {$nRange > $nRangeMax} {set nRangeMax $nRange}
  }
  if {$iFirstMax >= (1<<22)} {error "first-max is too large for format"}
  if {$nRangeMax >= (1<<10)} {error "range-max is too large for format"}

  puts -nonewline "  "
  puts [string trim {
  /* Each unsigned integer in the following array corresponds to a contiguous
  ** range of unicode codepoints that are not either letters or numbers (i.e.
  ** codepoints for which this function should return 0).
  **
  ** The most significant 22 bits in each 32-bit value contain the first 
  ** codepoint in the range. The least significant 10 bits are used to store
  ** the size of the range (always at least 1). In other words, the value 
  ** ((C<<22) + N) represents a range of N codepoints starting with codepoint 
  ** C. It is not possible to represent a range larger than 1023 codepoints 
  ** using this format.
  */
  }]
  puts -nonewline "  static const unsigned int aEntry\[\] = \{"
  set i 0
  foreach range $lRange {
    foreach {iFirst nRange} $range {}
    set u32 [format "0x%08X" [expr ($iFirst<<10) + $nRange]]

    if {($i % 5)==0} {puts "" ; puts -nonewline "   "}
    puts -nonewline " $u32,"
    incr i
  }
  puts ""
  puts "  \};"
}

proc an_print_ascii_bitmap {lRange} {
  foreach range $lRange {
    foreach {iFirst nRange} $range {}
    for {set i $iFirst} {$i < ($iFirst+$nRange)} {incr i} {
      if {$i<=127} { set a($i) 1 }
    }
  }

  set aAscii [list 0 0 0 0]
  foreach key [array names a] {
    set idx [expr $key >> 5]
    lset aAscii $idx [expr [lindex $aAscii $idx] | (1 << ($key&0x001F))]
  }

  puts "  static const unsigned int aAscii\[4\] = \{"
  puts -nonewline "   "
  foreach v $aAscii { puts -nonewline [format " 0x%08X," $v] }
  puts ""
  puts "  \};"
}

proc print_isalnum {zFunc lRange} {
  puts "/*"
  puts "** Return true if the argument corresponds to a unicode codepoint"
  puts "** classified as either a letter or a number. Otherwise false."
  puts "**"
  puts "** The results are undefined if the value passed to this function"
  puts "** is less than zero."
  puts "*/"
  puts "int ${zFunc}\(int c)\{"
  an_print_range_array $lRange
  an_print_ascii_bitmap $lRange
  puts {
  if( (unsigned int)c<128 ){
    return ( (aAscii[c >> 5] & ((unsigned int)1 << (c & 0x001F)))==0 );
  }else if( (unsigned int)c<(1<<22) ){
    unsigned int key = (((unsigned int)c)<<10) | 0x000003FF;
    int iRes = 0;
    int iHi = sizeof(aEntry)/sizeof(aEntry[0]) - 1;
    int iLo = 0;
    while( iHi>=iLo ){
      int iTest = (iHi + iLo) / 2;
      if( key >= aEntry[iTest] ){
        iRes = iTest;
        iLo = iTest+1;
      }else{
        iHi = iTest-1;
      }
    }
    assert( aEntry[0]<key );
    assert( key>=aEntry[iRes] );
    return (((unsigned int)c) >= ((aEntry[iRes]>>10) + (aEntry[iRes]&0x3FF)));
  }
  return 1;}
  puts "\}"
}

proc print_test_isalnum {zFunc lRange} {
  foreach range $lRange {
    foreach {iFirst nRange} $range {}
    for {set i $iFirst} {$i < ($iFirst+$nRange)} {incr i} { set a($i) 1 }
  }

  puts "static int isalnum_test(int *piCode)\{"
  puts -nonewline "  unsigned char aAlnum\[\] = \{"
  for {set i 0} {$i < 70000} {incr i} {
    if {($i % 32)==0} { puts "" ; puts -nonewline "    " }
    set bFlag [expr ![info exists a($i)]]
    puts -nonewline "${bFlag},"
  }
  puts ""
  puts "  \};"

  puts -nonewline "  int aLargeSep\[\] = \{"
  set i 0
  foreach iSep [lsort -integer [array names a]] {
    if {$iSep<70000} continue
    if {($i % 8)==0} { puts "" ; puts -nonewline "   " }
    puts -nonewline " $iSep,"
    incr i
  }
  puts ""
  puts "  \};"
  puts -nonewline "  int aLargeOther\[\] = \{"
  set i 0
  foreach iSep [lsort -integer [array names a]] {
    if {$iSep<70000} continue
    if {[info exists a([expr $iSep-1])]==0} {
      if {($i % 8)==0} { puts "" ; puts -nonewline "   " }
      puts -nonewline " [expr $iSep-1],"
      incr i
    }
    if {[info exists a([expr $iSep+1])]==0} {
      if {($i % 8)==0} { puts "" ; puts -nonewline "   " }
      puts -nonewline " [expr $iSep+1],"
      incr i
    }
  }
  puts ""
  puts "  \};"

  puts [subst -nocommands {
  int i;
  for(i=0; i<sizeof(aAlnum)/sizeof(aAlnum[0]); i++){
    if( ${zFunc}(i)!=aAlnum[i] ){
      *piCode = i;
      return 1;
    }
  }
  for(i=0; i<sizeof(aLargeSep)/sizeof(aLargeSep[0]); i++){
    if( ${zFunc}(aLargeSep[i])!=0 ){
      *piCode = aLargeSep[i];
      return 1;
    }
  }
  for(i=0; i<sizeof(aLargeOther)/sizeof(aLargeOther[0]); i++){
    if( ${zFunc}(aLargeOther[i])!=1 ){
      *piCode = aLargeOther[i];
      return 1;
    }
  }
  }]
  puts "  return 0;"
  puts "\}"
}

#-------------------------------------------------------------------------

proc tl_create_records {} {
  global tl_lookup_table

  set iFirst ""
  set nOff 0
  set nRange 0
  set nIncr 0

  set lRecord [list]
  foreach code [lsort -integer [array names tl_lookup_table]] {
    set mapping $tl_lookup_table($code)
    if {$iFirst == ""} {
      set iFirst $code
      set nOff   [expr $mapping - $code]
      set nRange 1
      set nIncr 1
    } else {
      set diff [expr $code - ($iFirst + ($nIncr * ($nRange - 1)))]
      if { $nRange==1 && ($diff==1 || $diff==2) } {
        set nIncr $diff
      }

      if {$diff != $nIncr || ($mapping - $code)!=$nOff} {
        if { $nRange==1 } {set nIncr 1}
        lappend lRecord [list $iFirst $nIncr $nRange $nOff]
        set iFirst $code
        set nOff   [expr $mapping - $code]
        set nRange 1
        set nIncr 1
      } else {
        incr nRange
      }
    }
  }

  lappend lRecord [list $iFirst $nIncr $nRange $nOff]

  set lRecord
}

proc tl_print_table_header {} {
  puts -nonewline "  "
  puts [string trim {
  /* Each entry in the following array defines a rule for folding a range
  ** of codepoints to lower case. The rule applies to a range of nRange
  ** codepoints starting at codepoint iCode.
  **
  ** If the least significant bit in flags is clear, then the rule applies
  ** to all nRange codepoints (i.e. all nRange codepoints are upper case and
  ** need to be folded). Or, if it is set, then the rule only applies to
  ** every second codepoint in the range, starting with codepoint C.
  **
  ** The 7 most significant bits in flags are an index into the aiOff[]
  ** array. If a specific codepoint C does require folding, then its lower
  ** case equivalent is ((C + aiOff[flags>>1]) & 0xFFFF).
  **
  ** The contents of this array are generated by parsing the CaseFolding.txt
  ** file distributed as part of the "Unicode Character Database". See
  ** http://www.unicode.org for details.
  */
  }]
  puts "  static const struct TableEntry \{"
  puts "    unsigned short iCode;"
  puts "    unsigned char flags;"
  puts "    unsigned char nRange;"
  puts "  \} aEntry\[\] = \{"
}

proc tl_print_table_entry {togglevar entry liOff} {
  upvar $togglevar t
  foreach {iFirst nIncr nRange nOff} $entry {}

  if {$iFirst > (1<<16)} { return 1 }

  if {[info exists t]==0} {set t 0}
  if {$t==0} { puts -nonewline "    " }

  set flags 0
  if {$nIncr==2} { set flags 1 ; set nRange [expr $nRange * 2]}
  if {$nOff<0}   { incr nOff [expr (1<<16)] }

  set idx [lsearch $liOff $nOff]
  if {$idx<0} {error "malfunction generating aiOff"}
  set flags [expr $flags + $idx*2]

  set txt "{$iFirst, $flags, $nRange},"
  if {$t==2} {
    puts $txt
  } else {
    puts -nonewline [format "% -23s" $txt]
  }
  set t [expr ($t+1)%3]

  return 0
}

proc tl_print_table_footer {togglevar} {
  upvar $togglevar t
  if {$t!=0} {puts ""}
  puts "  \};"
}

proc tl_print_if_entry {entry} {
  foreach {iFirst nIncr nRange nOff} $entry {}
  if {$nIncr==2} {error "tl_print_if_entry needs improvement!"}

  puts "  else if( c>=$iFirst && c<[expr $iFirst+$nRange] )\{"
  puts "    ret = c + $nOff;"
  puts "  \}"
}

proc tl_generate_ioff_table {lRecord} {
  foreach entry $lRecord {
    foreach {iFirst nIncr nRange iOff} $entry {}
    if {$iOff<0}   { incr iOff [expr (1<<16)] }
    if {[info exists a($iOff)]} continue
    set a($iOff) 1
  }

  set liOff [lsort -integer [array names a]]
  if {[llength $liOff]>128} { error "Too many distinct ioffs" }
  return $liOff
}

proc tl_print_ioff_table {liOff} {
  puts -nonewline "  static const unsigned short aiOff\[\] = \{"
  set i 0
  foreach off $liOff {
    if {($i % 8)==0} {puts "" ; puts -nonewline "   "}
    puts -nonewline [format "% -7s" "$off,"]
    incr i
  }
  puts ""
  puts "  \};"

}

proc print_fold {zFunc} {

  set lRecord [tl_create_records]

  set lHigh [list]
  puts "/*"
  puts "** Interpret the argument as a unicode codepoint. If the codepoint"
  puts "** is an upper case character that has a lower case equivalent,"
  puts "** return the codepoint corresponding to the lower case version."
  puts "** Otherwise, return a copy of the argument."
  puts "**"
  puts "** The results are undefined if the value passed to this function"
  puts "** is less than zero."
  puts "*/"
  puts "int ${zFunc}\(int c, int eRemoveDiacritic)\{"

  set liOff [tl_generate_ioff_table $lRecord]
  tl_print_table_header
  foreach entry $lRecord { 
    if {[tl_print_table_entry toggle $entry $liOff]} { 
      lappend lHigh $entry 
    } 
  }
  tl_print_table_footer toggle
  tl_print_ioff_table $liOff

  puts [subst -nocommands {
  int ret = c;

  assert( sizeof(unsigned short)==2 && sizeof(unsigned char)==1 );

  if( c<128 ){
    if( c>='A' && c<='Z' ) ret = c + ('a' - 'A');
  }else if( c<65536 ){
    const struct TableEntry *p;
    int iHi = sizeof(aEntry)/sizeof(aEntry[0]) - 1;
    int iLo = 0;
    int iRes = -1;

    assert( c>aEntry[0].iCode );
    while( iHi>=iLo ){
      int iTest = (iHi + iLo) / 2;
      int cmp = (c - aEntry[iTest].iCode);
      if( cmp>=0 ){
        iRes = iTest;
        iLo = iTest+1;
      }else{
        iHi = iTest-1;
      }
    }

    assert( iRes>=0 && c>=aEntry[iRes].iCode );
    p = &aEntry[iRes];
    if( c<(p->iCode + p->nRange) && 0==(0x01 & p->flags & (p->iCode ^ c)) ){
      ret = (c + (aiOff[p->flags>>1])) & 0x0000FFFF;
      assert( ret>0 );
    }

    if( eRemoveDiacritic ){
      ret = ${::remove_diacritic}(ret, eRemoveDiacritic==2);
    }
  }
  }]

  foreach entry $lHigh {
    tl_print_if_entry $entry
  }

  puts ""
  puts "  return ret;"
  puts "\}"
}

proc code {txt} {
  set txt [string trimright $txt]
  set txt [string trimleft $txt "\n"]
  set n [expr {[string length $txt] - [string length [string trim $txt]]}]
  set ret ""
  foreach L [split $txt "\n"] {
    append ret "[string range $L $n end]\n"
  }
  return [uplevel "subst -nocommands {$ret}"]
}

proc intarray {lInt} {
  set ret ""
  set n [llength $lInt]
  for {set i 0} {$i < $n} {incr i 10} {
    append ret "\n    "
    foreach int [lrange $lInt $i [expr $i+9]] {
      append ret [format "%-7s" "$int, "]
    }
  }
  append ret "\n  "
  set ret
}

proc categories_switch {Cvar first lSecond} {
  upvar $Cvar C
  set ret ""
  append ret "case '$first':\n"
  append ret "          switch( zCat\[1\] ){\n"
  foreach s $lSecond {
    append ret "            case '$s': aArray\[$C($first$s)\] = 1; break;\n"
  }
  append ret "            case '*': \n"
  foreach s $lSecond {
    append ret "              aArray\[$C($first$s)\] = 1;\n"
  }
  append ret "              break;\n"
  append ret "            default: return 1;"
  append ret "          }\n"
  append ret "          break;\n"
}

# Argument is a list. Each element of which is itself a list of two elements:
#
#   * the codepoint
#   * the category
#
# List elements are sorted in order of codepoint.
#
proc print_categories {lMap} {
  set categories {
    Cc Cf Cn Cs
    Ll Lm Lo Lt Lu
    Mc Me Mn
    Nd Nl No
    Pc Pd Pe Pf Pi Po Ps
    Sc Sk Sm So
    Zl Zp Zs

    LC Co
  }

  for {set i 0} {$i < [llength $categories]} {incr i} {
    set C([lindex $categories $i]) [expr 1+$i]
  }

  set caseC [categories_switch C C {c f n s o}]
  set caseL [categories_switch C L {l m o t u C}]
  set caseM [categories_switch C M {c e n}]
  set caseN [categories_switch C N {d l o}]
  set caseP [categories_switch C P {c d e f i o s}]
  set caseS [categories_switch C S {c k m o}]
  set caseZ [categories_switch C Z {l p s}]

  set nCat [expr [llength [array names C]] + 1]
  puts [code {
    int sqlite3Fts5UnicodeCatParse(const char *zCat, u8 *aArray){ 
      aArray[0] = 1;
      switch( zCat[0] ){
        $caseC
        $caseL
        $caseM
        $caseN
        $caseP
        $caseS
        $caseZ
      }
      return 0;
    }
  }]

  set nRepeat 0
  set first   [lindex $lMap 0 0]
  set class   [lindex $lMap 0 1]
  set prev -1

  set CASE(0) "Lu"
  set CASE(1) "Ll"

  foreach m $lMap {
    foreach {codepoint cl} $m {}
    set codepoint [expr "0x$codepoint"]
    if {$codepoint>=(1<<20)} continue

    set bNew 0
    if {$codepoint!=($prev+1)} {
      set bNew 1
    } elseif {
      $cl==$class || ($class=="LC" && $cl==$CASE([expr $nRepeat & 0x01]))
    } {
      incr nRepeat
    } elseif {$class=="Lu" && $nRepeat==1 && $cl=="Ll"} {
      set class LC
      incr nRepeat
    } else {
      set bNew 1
    }
    if {$bNew} {
      lappend lEntries [list $first $class $nRepeat]
      set nRepeat 1
      set first $codepoint
      set class $cl
    }
    set prev $codepoint
  }
  if {$nRepeat>0} {
    lappend lEntries [list $first $class $nRepeat]
  }

  set aBlock [list 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]
  set aMap [list]
  foreach e $lEntries {
    foreach {cp class nRepeat} $e {}
    set block [expr ($cp>>16)]
    if {$block>0 && [lindex $aBlock $block]==0} {
      for {set i 1} {$i<=$block} {incr i} {
        if {[lindex $aBlock $i]==0} {
          lset aBlock $i [llength $aMap]
        }
      }
    }
    lappend aMap [expr {$cp & 0xFFFF}]
    lappend aData [expr {($nRepeat << 5) + $C($class)}]
  }
  for {set i 1} {$i<[llength $aBlock]} {incr i} {
    if {[lindex $aBlock $i]==0} {
      lset aBlock $i [llength $aMap]
    }
  }

  set aBlockArray [intarray $aBlock]
  set aMapArray [intarray $aMap]
  set aDataArray [intarray $aData]
  puts [code {
    static u16 aFts5UnicodeBlock[] = {$aBlockArray};
    static u16 aFts5UnicodeMap[] = {$aMapArray};
    static u16 aFts5UnicodeData[] = {$aDataArray};

    int sqlite3Fts5UnicodeCategory(u32 iCode) { 
      int iRes = -1;
      int iHi;
      int iLo;
      int ret;
      u16 iKey;

      if( iCode>=(1<<20) ){
        return 0;
      }
      iLo = aFts5UnicodeBlock[(iCode>>16)];
      iHi = aFts5UnicodeBlock[1+(iCode>>16)];
      iKey = (iCode & 0xFFFF);
      while( iHi>iLo ){
        int iTest = (iHi + iLo) / 2;
        assert( iTest>=iLo && iTest<iHi );
        if( iKey>=aFts5UnicodeMap[iTest] ){
          iRes = iTest;
          iLo = iTest+1;
        }else{
          iHi = iTest;
        }
      }

      if( iRes<0 ) return 0;
      if( iKey>=(aFts5UnicodeMap[iRes]+(aFts5UnicodeData[iRes]>>5)) ) return 0;
      ret = aFts5UnicodeData[iRes] & 0x1F;
      if( ret!=$C(LC) ) return ret;
      return ((iKey - aFts5UnicodeMap[iRes]) & 0x01) ? $C(Ll) : $C(Lu);
    }

    void sqlite3Fts5UnicodeAscii(u8 *aArray, u8 *aAscii){
      int i = 0;
      int iTbl = 0;
      while( i<128 ){
        int bToken = aArray[ aFts5UnicodeData[iTbl] & 0x1F ];
        int n = (aFts5UnicodeData[iTbl] >> 5) + i;
        for(; i<128 && i<n; i++){
          aAscii[i] = (u8)bToken;
        }
        iTbl++;
      }
    }
  }]
}

proc print_test_categories {lMap} {

  set lCP [list]
  foreach e $lMap {
    foreach {cp cat} $e {}
    if {[expr 0x$cp] < (1<<20)} {
      lappend lCP "{0x$cp, \"$cat\"}, "
    }
  }

  set aCP "\n"
  for {set i 0} {$i < [llength $lCP]} {incr i 4} {
    append aCP "    [join [lrange $lCP $i $i+3]]\n"
  }


  puts [code {
    static int categories_test (int *piCode){
      struct Codepoint {
        int iCode;
        const char *zCat;
      } aCP[] = {$aCP};
      int i;
      int iCP = 0;

      for(i=0; i<1000000; i++){
        u8 aArray[40];
        int cat = 0;
        int c = 0;
        memset(aArray, 0, sizeof(aArray));
        if( aCP[iCP].iCode==i ){
          sqlite3Fts5UnicodeCatParse(aCP[iCP].zCat, aArray);
          iCP++;
        }else{
          aArray[0] = 1;
        }

        c = sqlite3Fts5UnicodeCategory((u32)i);
        if( aArray[c]==0 ){
          *piCode = i;
          return 1;
        }
      }

      return 0;
    }
  }]
}

proc print_fold_test {zFunc mappings} {
  global tl_lookup_table

  foreach m $mappings {
    set c [lindex $m 1]
    if {$c == ""} {
      set extra([lindex $m 0]) 0
    } else {
      scan $c %c i
      set extra([lindex $m 0]) $i
    }
  }

  puts "static int fold_test(int *piCode)\{"
  puts -nonewline "  static int aLookup\[\] = \{"
  for {set i 0} {$i < 70000} {incr i} {

    set expected $i
    catch { set expected $tl_lookup_table($i) }
    set expected2 $expected
    catch { set expected2 $extra($expected2) }

    if {($i % 4)==0}  { puts "" ; puts -nonewline "    " }
    puts -nonewline "$expected, $expected2, "
  }
  puts "  \};"
  puts "  int i;"
  puts "  for(i=0; i<sizeof(aLookup)/sizeof(aLookup\[0\]); i++)\{"
  puts "    int iCode = (i/2);"
  puts "    int bFlag = i & 0x0001;"
  puts "    if( ${zFunc}\(iCode, bFlag)!=aLookup\[i\] )\{"
  puts "      *piCode = iCode;"
  puts "      return 1;"
  puts "    \}"
  puts "  \}"
  puts "  return 0;"
  puts "\}"
}


proc print_fileheader {} {
  puts [string trim {
/*
** 2012-05-25
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
*/

/*
** DO NOT EDIT THIS MACHINE GENERATED FILE.
*/
  }]
  puts ""
  if {$::generate_fts5_code} {
    # no-op
  } else {
    puts "#ifndef SQLITE_DISABLE_FTS3_UNICODE"
    puts "#if defined(SQLITE_ENABLE_FTS3) || defined(SQLITE_ENABLE_FTS4)"
  }
  puts ""
  puts "#include <assert.h>"
  puts ""
}

proc print_test_main {} {
  puts ""
  puts "#include <stdio.h>"
  puts ""
  puts "int main(int argc, char **argv)\{"
  puts "  int r1, r2, r3;"
  puts "  int code;"
  puts "  r3 = 0;"
  puts "  r1 = isalnum_test(&code);"
  puts "  if( r1 ) printf(\"isalnum(): Problem with code %d\\n\",code);"
  puts "  else printf(\"isalnum(): test passed\\n\");"
  puts "  r2 = fold_test(&code);"
  puts "  if( r2 ) printf(\"fold(): Problem with code %d\\n\",code);"
  puts "  else printf(\"fold(): test passed\\n\");"
  if {$::generate_fts5_code} {
    puts "  r3 = categories_test(&code);"
    puts "  if( r3 ) printf(\"categories(): Problem with code %d\\n\",code);"
    puts "  else printf(\"categories(): test passed\\n\");"
  }
  puts "  return (r1 || r2 || r3);"
  puts "\}"
}

# Proces the command line arguments. Exit early if they are not to
# our liking.
#
proc usage {} {
  puts -nonewline stderr "Usage: $::argv0 ?-test? ?-fts5? "
  puts            stderr "<CaseFolding.txt file> <UnicodeData.txt file>"
  exit 1
}
if {[llength $argv]<2} usage
set unicodedata.txt [lindex $argv end]
set casefolding.txt [lindex $argv end-1]

set remove_diacritic remove_diacritic
set generate_test_code 0
set generate_fts5_code 0
set function_prefix "sqlite3Fts"
for {set i 0} {$i < [llength $argv]-2} {incr i} {
  switch -- [lindex $argv $i] {
    -test {
      set generate_test_code 1
    }
    -fts5 {
      set function_prefix sqlite3Fts5
      set generate_fts5_code 1
      set remove_diacritic fts5_remove_diacritic
    }
    default {
      usage
    }
  }
}

print_fileheader

if {$::generate_test_code} {
  puts "typedef unsigned short int u16;"
  puts "typedef unsigned char u8;"
  puts "#include <string.h>"
}

# Print the isalnum() function to stdout.
#
set lRange [an_load_separator_ranges]
if {$generate_fts5_code==0} {
  print_isalnum ${function_prefix}UnicodeIsalnum $lRange
}

# Leave a gap between the two generated C functions.
#
puts ""
puts ""

# Load the fold data. This is used by the [rd_XXX] commands
# as well as [print_fold].
tl_load_casefolding_txt ${casefolding.txt}

set mappings [rd_load_unicodedata_text ${unicodedata.txt}]
print_rd $mappings
puts ""
puts ""
print_isdiacritic ${function_prefix}UnicodeIsdiacritic $mappings
puts ""
puts ""

# Print the fold() function to stdout.
#
print_fold ${function_prefix}UnicodeFold

if {$generate_fts5_code} {
  puts ""
  puts ""
  print_categories [cc_load_unicodedata_text ${unicodedata.txt}]
}

# Print the test routines and main() function to stdout, if -test 
# was specified.
#
if {$::generate_test_code} {
  if {$generate_fts5_code==0} {
    print_test_isalnum ${function_prefix}UnicodeIsalnum $lRange
  }
  print_fold_test ${function_prefix}UnicodeFold $mappings
  print_test_categories [cc_load_unicodedata_text ${unicodedata.txt}]
  print_test_main 
}

if {$generate_fts5_code} {
  # no-op
} else {
  puts "#endif /* defined(SQLITE_ENABLE_FTS3) || defined(SQLITE_ENABLE_FTS4) */"
  puts "#endif /* !defined(SQLITE_DISABLE_FTS3_UNICODE) */"
}
