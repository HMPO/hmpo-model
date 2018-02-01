'use strict';

const LocalModel = require('./local-model');
const requestLib = require('request');
const _ = require('underscore');
const kebabCase = require('lodash.kebabcase');
const hmpoLogger = require('hmpo-logger');

class RemoteModel extends LocalModel {
    constructor(attributes, options) {
        super(attributes, options);

        this.setLogger();
    }

    setLogger() {
        this.logger = hmpoLogger.get(`:${kebabCase(this.constructor.name)}`);
    }

    fetch(callback) {
        let config = this.requestConfig({method: 'GET'});
        this.request(config, callback);
    }

    save(callback) {
        this.prepare((err, data) => {

            if (err) { return callback(err); }

            data = JSON.stringify(data);

            let config = this.requestConfig({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            });

            this.request(config, data, callback);

        });
    }

    delete(callback) {
        let config  = this.requestConfig({method: 'DELETE'});
        this.request(config, callback);
    }

    requestConfig(config) {
        let retConfig = _.clone(config);

        retConfig.uri = this.url();

        let auth = this.auth();

        if (auth) {
            retConfig.auth = auth;
        }

        if (this.options.headers) {
            retConfig.headers = _.extend(this.options.headers, retConfig.headers);
        }

        return retConfig;
    }

    request(settings, body, callback) {
        if (typeof body === 'function' && arguments.length === 2) {
            callback = body;
            body = undefined;
        }

        // This is cloned and set so that the post body is not kept around in memory
        // settings is a shallow object, so the requestSettings is entirely made up of copied properties
        let requestSettings = _.clone(settings);
        requestSettings.body = body;

        let startTime = process.hrtime();

        let _callback = (err, data, statusCode) => {

            // This uses node's "high resolution time" to determine response time.
            // The calculation is to translate seconds & nanoseconds into a number of format 1.234 seconds
            let endTime = process.hrtime(startTime);
            let responseTime = Number((endTime[0]*1000 + endTime[1]/1000000).toFixed(3));

            if (err) {
                this.logError({settings, statusCode, responseTime, err, data});
                this.emit('fail', err, data, settings, statusCode, responseTime);
            } else {
                this.logSuccess({settings, statusCode, responseTime});
                this.emit('success', data, settings, statusCode, responseTime);
            }
            if (typeof callback === 'function') {
                callback(err, data, responseTime);
            }
        };

        requestLib(requestSettings, (err, response) => {
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

        this.logSync({settings});
        this.emit('sync', settings);
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

    url() {
        return this.options.url;
    }

    auth(credentials) {
        if (!credentials) return;

        if (typeof credentials === 'string') {
            let auth = credentials.split(':');
            credentials = {
                user: auth.shift(),
                pass: auth.join(':'),
                sendImmediately: true
            };
        }

        return credentials;
    }

    logMeta(tokenData) {
        let data = {
            outVerb: tokenData.settings.method,
            outRequest: tokenData.settings.uri
        };

        if (tokenData.statusCode) {
            data.outResponseCode = tokenData.statusCode;
        }

        if (tokenData.responseTime) {
            data.outResponseTime = tokenData.responseTime;
        }

        let outError = (tokenData.err && tokenData.err.message) || (tokenData.data && ( tokenData.data.error || tokenData.data.errors ) );
        if (outError) data.outError = outError;

        if (tokenData.err) {
            data.outErrorBody = this.logger.trimHtml(tokenData.err.body);
        }

        _.extend(data, this.options.logging);

        return data;
    }


    logSync() {
        this.logger.outbound('Model request sent :outVerb :outRequest', this.logMeta.apply(this, arguments));
    }

    logSuccess() {
        this.logger.outbound('Model request success :outVerb :outRequest :outResponseCode', this.logMeta.apply(this, arguments));
    }

    logError() {
        this.logger.outbound('Model request failed :outVerb :outRequest :outResponseCode :outError', this.logMeta.apply(this, arguments));
    }
}

module.exports = RemoteModel;
