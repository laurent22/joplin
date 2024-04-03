```
let str = `   hello world  !  `;
let _trim = function () {
  if (typeof this == "number") new Error("Invalid or unexpected token");
  if (typeof this !== "string")
    new Error("Cannot read property 'trim' of" + this);
  let reg = /^\s*|\s*$/g;
  return this.replace(reg, "");
};
 
String.prototype._trim = _trim;
```