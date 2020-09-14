// A test case for the LEMON parser generator.  Run as follows:
//
//     lemon lemon-test01.y && gcc -g lemon-test01.c && ./a.out
//
%token_prefix TK_
%token_type   int
%default_type int
%include {
  static int nSyntaxError = 0;
  static int nAccept = 0;
  static int nFailure = 0;
}

all ::=  A B.
all ::=  error B.

%syntax_error {
  nSyntaxError++;
}
%parse_accept {
  nAccept++;
}
%parse_failure {
  nFailure++;
}
%code {
  #include <assert.h>
  #include "lemon-test01.h"
  static int nTest = 0;
  static int nErr = 0;
  static int testCase(int testId, int shouldBe, int actual){
    nTest++;
    if( shouldBe==actual ){
      printf("test %d: ok\n", testId);
    }else{
      printf("test %d: got %d, expected %d\n", testId, actual, shouldBe);
      nErr++;
    }
  }
  int main(int argc, char **argv){
    yyParser xp;
    ParseInit(&xp);
    Parse(&xp, TK_A, 0);
    Parse(&xp, TK_B, 0);
    Parse(&xp, 0, 0);
    ParseFinalize(&xp);
    testCase(100, 0, nSyntaxError);
    testCase(110, 1, nAccept);
    testCase(120, 0, nFailure);
    nSyntaxError = nAccept = nFailure = 0;
    ParseInit(&xp);
    Parse(&xp, TK_B, 0);
    Parse(&xp, TK_B, 0);
    Parse(&xp, 0, 0);
    ParseFinalize(&xp);
    testCase(200, 1, nSyntaxError);
    testCase(210, 1, nAccept);
    testCase(220, 0, nFailure);
    nSyntaxError = nAccept = nFailure = 0;
    ParseInit(&xp);
    Parse(&xp, TK_A, 0);
    Parse(&xp, TK_A, 0);
    Parse(&xp, 0, 0);
    ParseFinalize(&xp);
    testCase(200, 1, nSyntaxError);
    testCase(210, 0, nAccept);
    testCase(220, 0, nFailure);
    if( nErr==0 ){
      printf("%d tests pass\n", nTest);
    }else{
      printf("%d errors out %d tests\n", nErr, nTest);
    }
    return nErr;
  }
}
