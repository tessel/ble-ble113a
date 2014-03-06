function Address(address) {
  this._str;
  this._buf;

  if (typeof address === "string") {
    this._str = address;
    this._buf = Address.strToBuf(this._str);
  }
  else if (Buffer.isBuffer(address)) {
    this._buf = address;
    this._str = Address.bufToStr(this._buf);
  }
  else {
    throw new Error("Address intializer must be string or buffer.");
  }
}

Address.prototype.toString = function() {
return this._str;
}

Address.prototype.toBuffer = function() {
return this._buf;
}

Address.strToBuf = function(addressStr) {
  var b = new Buffer(6);
  var bytes = addressStr.split('.');
  for (var i = 0; i < bytes.length; i++) {
    b.writeUInt8(bytes[i], i);
  }
  return b;
}

Address.bufToStr = function(addressBuf) {
  var str = "";
  for (var i = 0; i < addressBuf.length; i++) {
    str+= addressBuf.readUInt8(i).toString(10);
    if (i != addressBuf.length-1) {
      str+=".";
    }
  }
  return str;
}

module.exports = Address;
module.exports.bufToStr = Address.bufToStr;
module.exports.strToBuf = Address.strToBuf;
