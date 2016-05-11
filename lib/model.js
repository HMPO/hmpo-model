var _ = require('underscore'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    concat = require('concat-stream'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var Model = function (attributes, options) {

    this.options = options || {};
    this.attributes = {};
    this.set(attributes, { silent: true });
};

util.inherits(Model, EventEmitter);

_.extend(Model.prototype, {

    save: function (options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        this.prepare(function (err, data) {

            if (err) { return callback(err); }

            data = JSON.stringify(data);

            var reqConf = this.requestConfig(options);

            reqConf.method = options.method || 'POST';

            reqConf.headers = _.extend({
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }, reqConf.headers || {});

            this.request(reqConf, data, callback);

        }.bind(this));
    },

    fetch: function (options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        var reqConf = this.requestConfig(options);
        reqConf.method = options.method || 'GET';
        this.request(reqConf, callback);
    },

    delete: function (options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        var reqConf = this.requestConfig(options);
        reqConf.method = options.method || 'DELETE';
        this.request(reqConf, callback);
    },

    requestConfig: function (options) {
        var reqConf = this.url(options);
        if (typeof reqConf === 'string') {
            reqConf = url.parse(reqConf);
        }
        return reqConf;
    },

    request: function (settings, body, callback) {
        if (typeof body === 'function' && arguments.length === 2) {
            callback = body;
            body = undefined;
        }

        if (settings.data) {
            body = settings.data;
        }

        var protocol = (settings.protocol === 'http:') ? http : https;
        settings.auth = this.auth();

        var timeDiff = function (from, to, digits) {
            if (digits === undefined) { digits = 3; }
            var ms = (to[0] - from[0]) * 1e3
                + (to[1] - from[1]) * 1e-6;
            return +ms.toFixed(digits);
        };

        var startTime = process.hrtime();

        var timeoutTimer;

        var _callback = function (err, data, statusCode) {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }

            var endTime = process.hrtime();
            var responseTime = timeDiff(startTime, endTime);

            if (err) {
                this.emit('fail', err, data, settings, statusCode, responseTime);
            } else {
                this.emit('success', data, settings, statusCode, responseTime);
            }
            if (typeof callback === 'function') {
                callback(err, data, responseTime);
            }
        }.bind(this);

        var request = protocol.request(settings, function (response) {
            this.handleResponse(response, _callback);
        }.bind(this));

        var timeoutOccured = false;
        if (settings.timeout || this.options.timeout) {
            timeoutTimer = setTimeout(function () {
                timeoutOccured = true;
                request.abort();
            }, settings.timeout || this.options.timeout);
        }

        request.on('error', function(e) {
            if (timeoutOccured && e.code === 'ECONNRESET') {
                e.code = 'ETIMEDOUT';
                e.message = 'Connection timed out';
                e.status = 504;
            }
            _callback(e, null, e.status || 503);
        });

        this.emit('sync', settings);
        if (body) {
            request.write(body);
            body = null;
        }
        request.end();

    },

    handleResponse: function(response, callback) {
        response.pipe(concat(function (d) {
            d = d.toString();
            var data = {};
            try {
                data = JSON.parse(d || '{}');
            } catch (e) {
                e.status = response.statusCode;
                e.body = d;
                return callback(e, null, response.statusCode);
            }
            this.parseResponse(response.statusCode, data, callback);
        }.bind(this)));
    },

    parseResponse: function (statusCode, data, callback) {
        if (statusCode < 400) {
            try {
                data = this.parse(data);
                callback(null, data, statusCode);
            } catch (e) {
                callback(e, null, statusCode);
            }
        } else {
            callback(this.parseError(statusCode, data), data, statusCode);
        }
    },

    prepare: function (callback) {
        callback(null, this.toJSON());
    },

    parse: function (data) {
        return data;
    },

    parseError: function (statusCode, data) {
        return _.extend({ status: statusCode }, data);
    },

    get: function (key) {
        return this.attributes[key];
    },

    set: function (key, value, options) {

        var attrs = {};

        if (typeof key === 'string') {
            attrs[key] = value;
        } else {
            attrs = key;
            options = value;
        }
        options = options || {};

        var old = this.toJSON(),
            changed = {};

        _.each(attrs, function (value, key) {
            if (value !== old[key]) {
                changed[key] = value;
            }
        });

        _.extend(this.attributes, attrs);

        if (!options.silent && !_.isEmpty(changed)) {
            _.each(changed, function (value, key) {
                this.emit('change:' + key, this.get(key), old[key]);
            }, this);
            this.emit('change', changed);
        }

        return this;
    },

    unset: function (fields, options) {
        options = options || {};
        if (typeof fields === 'string') {
            fields = [fields];
        }
        var old = this.toJSON(),
            changed = {};

        _.each(fields, function (key) {
            if (old[key] !== undefined) {
                changed[key] = undefined;
                delete this.attributes[key];
            }
        }, this);

        if (!options.silent && !_.isEmpty(changed)) {
            _.each(changed, function (value, key) {
                this.emit('change:' + key, undefined, old[key]);
            }, this);
            this.emit('change', changed);
        }

        return this;
    },

    increment: function (property, amount) {
        if (!property || typeof property !== 'string') {
            throw new Error('Trying to increment undefined property');
        }
        var val = this.get(property) || 0;
        amount = amount || 1;
        this.set(property, val + amount);
    },

    reset: function (options) {
        options = options || {};
        var keys = Object.keys(this.attributes);
        this.attributes = {};
        if (!options.silent) {
            _.each(keys, function (key) {
                this.emit('change:' + key, undefined);
            }, this);
            this.emit('reset');
        }
    },

    url: function (options) {
        options = options || {};
        var opts = {};
        if (options.url) {
            opts = url.parse(options.url);
        }
        // passing a host to url.format overrides other options, so remove it
        delete opts.host;
        _.extend(opts, options);
        return url.format(opts);
    },

    auth: function () {
        return;
    },

    toJSON: function () {
        return _.clone(this.attributes);
    }
});

module.exports = Model;
