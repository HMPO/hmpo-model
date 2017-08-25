'use strict';

const url = require('url');

class Util {
    timeDiff(from, to, digits) {
        if (digits === undefined) { digits = 3; }
        let ms = (to[0] - from[0]) * 1e3
            + (to[1] - from[1]) * 1e-6;
        return +ms.toFixed(digits);
    }

    urlKeys() {
        Object.keys(url.parse(''));
    }
}

module.exports = new Util();
