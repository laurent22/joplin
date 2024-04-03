```
1.  let str = `   hello world  !  `;
2.  let _trim = function () {
3.    if (typeof this == "number") new Error("Invalid or unexpected token");
4.    if (typeof this !== "string")
5.      new Error("Cannot read property 'trim' of" + this);
6.    let reg = /^\s*|\s*$/g;
7.    return this.replace(reg, "");
8.  };
9.   
10. String.prototype._trim = _trim;
```