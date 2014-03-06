function UUID(uuid) {
  this._str;
  this._buf;

  if (typeof uuid === "string") {
    this._str = uuid;
    this._buf = UUID.strToBuf(this._str);
  }
  else if (Buffer.isBuffer(uuid)) {
    this._buf = uuid;
    this._str = UUID.bufToStr(this._buf);
  }
  else {
    throw new Error("UUID intializer must be string or buffer.");
  }
}

UUID.prototype.toString = function() {
  return this._str;
}

UUID.prototype.toBuffer = function() {
  return this._buf;
}

UUID.strToBuf = function(uuidStr) {
  // Every two hex values is a byte
  var numBytes = uuidStr.length/2;

  // Create the return buf
  var buf = new Buffer(numBytes);

  // If it's just an odd number, return nothing
  if (numBytes % 2) {
    throw new Error("Invalid UUID" + uuidStr + ".");
  }

  for (var i = 0; i < numBytes; i++) {
    // The "0x" is a hack until beta/#206 is fixed
    buf.writeUInt8(parseInt("0x" + uuidStr.substr((i*2), 2), 16), numBytes-i-1);
  }

  return buf;
}

UUID.bufToStr = function(uuidBuf) {
  var str = "";
  var length = uuidBuf.length;
  var elem;

  for (var i = 0; i < length; i++) {
    elem = uuidBuf.readUInt8(length-1-i).toString(16);
    if (elem.length === 1) {
      elem = "0" + elem;
    }
    str += elem;

  }
  return str
}

module.exports = UUID;
module.exports.bufToStr = UUID.bufToStr;
module.exports.strToBuf = UUID.strToBuf;
