'use strict';

/**
 * @link https://stackoverflow.com/questions/36487636/javascript-convert-array-buffer-to-string
 * @param {ArrayBuffer} buffer
 * @return {string}
 */
module.exports = function arrayBufferToString(buffer) {
    var byteArray = new Uint8Array(buffer);
    var str = '';
    var cc = 0;
    var numBytes = 0;
    for (var i = 0, len = byteArray.length; i < len; ++i) {
        var v = byteArray[i];
        if (numBytes > 0) {
            //2 bit determining that this is a tailing byte + 6 bit of payload
            if ((cc & 192) === 192) {
                //processing tailing-bytes
                cc = (cc << 6) | (v & 63);
            } else {
                throw new Error('this is no tailing-byte');
            }
        } else if (v < 128) {
            //single-byte
            numBytes = 1;
            cc = v;
        } else if (v < 192) {
            //these are tailing-bytes
            throw new Error('invalid byte, this is a tailing-byte');
        } else if (v < 224) {
            //3 bits of header + 5bits of payload
            numBytes = 2;
            cc = v & 31;
        } else if (v < 240) {
            //4 bits of header + 4bit of payload
            numBytes = 3;
            cc = v & 15;
        } else {
            //UTF-8 theoretically supports up to 8 bytes containing up to 42bit of payload
            //but JS can only handle 16bit.
            throw new Error('invalid encoding, value out of range');
        }

        if (--numBytes === 0) {
            str += String.fromCharCode(cc);
        }
    }
    if (numBytes) {
        throw new Error('the bytes don\'t sum up');
    }
    return str;
};
