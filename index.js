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
        }
        this.prepare(function (err, data) {

            if (err) { return callback(err); }

            data = JSON.stringify(data);

            var reqConf = url.parse(this.url(options));
            reqConf.method = options.method || 'POST';

            reqConf.headers = {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            };

            reqConf.data = data;

            this.buildRequest(reqConf, callback);

        }.bind(this));
    },

    fetch: function (options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        }
        var reqConf = url.parse(this.url(options));
        reqConf.method = options.method || 'GET';
        this.buildRequest(reqConf, callback);
    },

    delete: function (options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        }
        var reqConf = url.parse(this.url(options));
        reqConf.method = options.method || 'DELETE';
        this.buildRequest(reqConf, callback);
    },

    buildRequest: function (settings, callback) {
        var protocol = (settings.protocol === 'http:') ? http : https;
        settings.auth = this.auth();

        var request = protocol.request(settings, function (response) {
            this.handleResponse(response, settings, callback);
        }.bind(this));
        request.on('error', function(e) {
            callback(e);
        }.bind(this));
        if (settings.data) {
            request.write(settings.data);
        }
        request.end();

    },

    handleResponse: function(response, settings, callback) {

        response.pipe(concat(function (d) {
            var data = {};
            try {
                data = JSON.parse(d.toString());
            } catch (e) {
                return callback(new Error('Invalid JSON response'));
            }

            if (response.statusCode < 400) {
                try {
                    data = this.parse(data);
                    callback(null, data);
                } catch (e) {
                    callback(e);
                }
            } else {
                callback(this.parseError(response.statusCode, data), data);
            }
        }.bind(this)));
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