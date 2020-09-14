#
# 2014 Jun 09
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#-------------------------------------------------------------------------
#
# This script generates the implementations of the following C functions,
# which are part of the porter tokenizer implementation:
#
#   static int fts5PorterStep1B(char *aBuf, int *pnBuf);
#   static int fts5PorterStep1B2(char *aBuf, int *pnBuf);
#   static int fts5PorterStep2(char *aBuf, int *pnBuf);
#   static int fts5PorterStep3(char *aBuf, int *pnBuf);
#   static int fts5PorterStep4(char *aBuf, int *pnBuf);
#

set O(Step1B2) {
  { at  {} ate 1 }
  { bl  {} ble 1 }
  { iz  {} ize 1 }
}

set O(Step1B) {
  { "eed"  fts5Porter_MGt0  "ee" 0 }
  { "ed"   fts5Porter_Vowel ""   1 }
  { "ing"  fts5Porter_Vowel ""   1 }
}

set O(Step2) {
  { "ational" fts5Porter_MGt0 "ate" } 
  { "tional"  fts5Porter_MGt0 "tion" } 
  { "enci"    fts5Porter_MGt0 "ence" } 
  { "anci"    fts5Porter_MGt0 "ance" } 
  { "izer"    fts5Porter_MGt0 "ize" } 
  { "logi"    fts5Porter_MGt0 "log" }
  { "bli"     fts5Porter_MGt0 "ble" }
  { "alli"    fts5Porter_MGt0 "al" } 
  { "entli"   fts5Porter_MGt0 "ent" } 
  { "eli"     fts5Porter_MGt0 "e" } 
  { "ousli"   fts5Porter_MGt0 "ous" } 
  { "ization" fts5Porter_MGt0 "ize" } 
  { "ation"   fts5Porter_MGt0 "ate" } 
  { "ator"    fts5Porter_MGt0 "ate" } 
  { "alism"   fts5Porter_MGt0 "al" } 
  { "iveness" fts5Porter_MGt0 "ive" } 
  { "fulness" fts5Porter_MGt0 "ful" } 
  { "ousness" fts5Porter_MGt0 "ous" } 
  { "aliti"   fts5Porter_MGt0 "al" } 
  { "iviti"   fts5Porter_MGt0 "ive" } 
  { "biliti"  fts5Porter_MGt0 "ble" } 
}

set O(Step3) {
  { "icate" fts5Porter_MGt0 "ic" } 
  { "ative" fts5Porter_MGt0 "" } 
  { "alize" fts5Porter_MGt0 "al" } 
  { "iciti" fts5Porter_MGt0 "ic" } 
  { "ical" fts5Porter_MGt0 "ic" } 
  { "ful" fts5Porter_MGt0 "" } 
  { "ness" fts5Porter_MGt0 "" } 
}

set O(Step4) {
  { "al" fts5Porter_MGt1 "" } 
  { "ance" fts5Porter_MGt1 "" } 
  { "ence" fts5Porter_MGt1 "" } 
  { "er" fts5Porter_MGt1 "" } 
  { "ic" fts5Porter_MGt1 "" } 
  { "able" fts5Porter_MGt1 "" } 
  { "ible" fts5Porter_MGt1 "" } 
  { "ant" fts5Porter_MGt1 "" } 
  { "ement" fts5Porter_MGt1 "" } 
  { "ment" fts5Porter_MGt1 "" } 
  { "ent" fts5Porter_MGt1 "" } 
  { "ion" fts5Porter_MGt1_and_S_or_T "" } 
  { "ou"  fts5Porter_MGt1 "" } 
  { "ism" fts5Porter_MGt1 "" } 
  { "ate" fts5Porter_MGt1 "" } 
  { "iti" fts5Porter_MGt1 "" } 
  { "ous" fts5Porter_MGt1 "" } 
  { "ive" fts5Porter_MGt1 "" } 
  { "ize" fts5Porter_MGt1 "" } 
}

proc sort_cb {lhs rhs} {
  set L [string range [lindex $lhs 0] end-1 end-1]
  set R [string range [lindex $rhs 0] end-1 end-1]
  string compare $L $R
}

proc create_step_function {name data} {

  set T(function) {
static int fts5Porter${name}(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    ${switchbody}
  }
  return ret;
}
  }

  set T(case) {
    case '${k}': 
      ${ifstmts}
      break;
  }

  set T(if_0_0_0) {
      if( ${match} ){
        *pnBuf = nBuf - $n;
      }
  }
  set T(if_1_0_0) {
      if( ${match} ){
        if( ${cond} ){
          *pnBuf = nBuf - $n;
        }
      }
  }
  set T(if_0_1_0) {
      if( ${match} ){
        ${memcpy}
        *pnBuf = nBuf - $n + $nRep;
      }
  }
  set T(if_1_1_0) {
      if( ${match} ){
        if( ${cond} ){
          ${memcpy}
          *pnBuf = nBuf - $n + $nRep;
        }
      }
  }
  set T(if_1_0_1) {
      if( ${match} ){
        if( ${cond} ){
          *pnBuf = nBuf - $n;
          ret = 1;
        }
      }
  }
  set T(if_0_1_1) {
      if( ${match} ){
        ${memcpy}
        *pnBuf = nBuf - $n + $nRep;
        ret = 1;
      }
  }
  set T(if_1_1_1) {
      if( ${match} ){
        if( ${cond} ){
          ${memcpy}
          *pnBuf = nBuf - $n + $nRep;
          ret = 1;
        }
      }
  }

  set switchbody ""

  foreach I $data {
    set k [string range [lindex $I 0] end-1 end-1]
    lappend aCase($k) $I
  }
  foreach k [lsort [array names aCase]] {
    set ifstmts ""
    foreach I $aCase($k) {
      set zSuffix [lindex $I 0]         ;# Suffix text for this rule
      set zRep [lindex $I 2]            ;# Replacement text for rule 
      set xCond [lindex $I 1]           ;# Condition callback (or "")

      set n [string length $zSuffix]
      set nRep [string length $zRep]

      set match "nBuf>$n && 0==memcmp(\"$zSuffix\", &aBuf\[nBuf-$n\], $n)"
      set memcpy "memcpy(&aBuf\[nBuf-$n\], \"$zRep\", $nRep);"
      set cond "${xCond}(aBuf, nBuf-$n)"

      set bMemcpy [expr {$nRep>0}]
      set bCond [expr {$xCond!=""}]
      set bRet [expr {[llength $I]>3 && [lindex $I 3]}]

      set t $T(if_${bCond}_${bMemcpy}_${bRet})
      lappend ifstmts [string trim [subst -nocommands $t]]
    }

    set ifstmts [join $ifstmts "else "]

    append switchbody [subst -nocommands $T(case)]
  }


  puts [subst -nocommands $T(function)]
}


puts [string trim {
/**************************************************************************
***************************************************************************
** GENERATED CODE STARTS HERE (mkportersteps.tcl)
*/
}]
foreach step [array names O] {
  create_step_function $step $O($step)
}
puts [string trim {
/* 
** GENERATED CODE ENDS HERE (mkportersteps.tcl)
***************************************************************************
**************************************************************************/
}]



