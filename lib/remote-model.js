'use strict';

const LocalModel = require('./local-model');
const url = require('url');
const util = require('./util');
const request = require('request');
const _ = require('underscore');


class RemoteModel extends LocalModel {
    fetch(options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        let reqConf = this.requestConfig(options);
        reqConf.method = options.method || 'GET';
        this.request(reqConf, callback);
    }

    save(options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        this.prepare((err, data) => {

            if (err) {
                return callback(err);
            }

            data = JSON.stringify(data);

            let reqConf = this.requestConfig(options);

            reqConf.method = options.method || 'POST';

            reqConf.headers = _.extend({
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }, reqConf.headers || {});

            this.request(reqConf, data, callback);
        });
    }

    delete(options, callback) {
        if (typeof options === 'function' && arguments.length === 1) {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }
        let reqConf = this.requestConfig(options);
        reqConf.method = options.method || 'DELETE';
        this.request(reqConf, callback);
    }

    requestConfig(options) {
        let reqConf = this.url(options);
        if (typeof reqConf === 'string') {
            reqConf = url.parse(reqConf);
        }
        return reqConf;
    }

    request(originalSettings, body, callback) {
        if (typeof body === 'function' && arguments.length === 2) {
            callback = body;
            body = undefined;
        }

        let settings = _.extend({}, originalSettings);
        settings.timeout = settings.timeout || this.options.timeout;
        settings.uri = settings.uri || settings.url || url.format(settings);
        settings.body = settings.body || body || settings.data;

        settings = _.omit(settings, util.urlKeys, 'data', 'url');

        settings.auth = this.auth();
        if (typeof settings.auth === 'string') {
            let auth = settings.auth.split(':');
            settings.auth = {
                user: auth.shift(),
                pass: auth.join(':'),
                sendImmediately: true
            };
        }

        let startTime = process.hrtime();

        let timeoutTimer;

        let _callback = (err, data, statusCode) => {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }

            let endTime = process.hrtime();
            let responseTime = util.timeDiff(startTime, endTime);

            if (err) {
                this.emit('fail', err, data, originalSettings, statusCode, responseTime);
            } else {
                this.emit('success', data, originalSettings, statusCode, responseTime);
            }
            if (typeof callback === 'function') {
                callback(err, data, responseTime);
            }
        };

        request(settings, (err, response) => {
            if (err) {
                if (err.code === 'ETIMEDOUT') {
                    err.message = 'Connection timed out';
                    err.status = 504;
                }
                err.status = err.status || (response && response.statusCode) || 503;
                return _callback(err, null, err.status);
            }
            this.handleResponse(response, _callback);
        });

        this.emit('sync', originalSettings);
    }

    handleResponse(response, callback) {
        let data = {};
        try {
            data = JSON.parse(response.body || '{}');
        } catch (err) {
            err.status = response.statusCode;
            err.body = response.body;
            return callback(err, null, response.statusCode);
        }
        this.parseResponse(response.statusCode, data, callback);
    }

    parseResponse(statusCode, data, callback) {
        if (statusCode < 400) {
            try {
                data = this.parse(data);
                callback(null, data, statusCode);
            } catch (err) {
                callback(err, null, statusCode);
            }
        } else {
            callback(this.parseError(statusCode, data), data, statusCode);
        }
    }

    prepare(callback) {
        callback(null, this.toJSON());
    }

    parse(data) {
        return data;
    }

    parseError(statusCode, data) {
        return _.extend({ status: statusCode }, data);
    }


    url(options) {
        options = options || {};
        let opts = {};
        if (options.url) {
            opts = url.parse(options.url);
        }
        // passing a host to url.format overrides other options, so remove it
        delete opts.host;
        _.extend(opts, options);
        return url.format(opts);
    }

    auth() {
        return;
    }
}

module.exports = RemoteModel;
