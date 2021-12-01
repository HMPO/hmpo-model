'use strict';

const debug = require('debug')('hmpo:model:remote');
const LocalModel = require('./local-model');
const got = require('got');
const kebabCase = require('lodash.kebabcase');
const { URL } = require('url');

const DEFAULT_TIMEOUT = 60000;

class RemoteModel extends LocalModel {
    constructor(attributes, options) {
        super(attributes, options);
        this.got = got;
        this.options.label = this.options.label || kebabCase(this.constructor.name);
        this.setLogger();
    }

    setLogger() {
        try {
            const hmpoLogger = require('hmpo-logger');
            this.logger = hmpoLogger.get(':' + this.options.label);
        } catch (e) {
            console.error('Error setting logger, using console instead!', e);
            this.logger = { outbound: console.log, trimHtml: html => html };
        }
    }

    fetch(args, callback) {
        if (typeof args === 'function') {
            callback = args;
            args = undefined;
        }
        const config = this.requestConfig({method: 'GET'}, args);
        this.request(config, callback);
    }

    save(args, callback) {
        if (typeof args === 'function') {
            callback = args;
            args = undefined;
        }
        this.prepare((err, json) => {
            if (err) return callback(err);
            const config = this.requestConfig({method: 'POST', json}, args);
            this.request(config, callback);
        });
    }

    delete(args, callback) {
        if (typeof args === 'function') {
            callback = args;
            args = undefined;
        }
        const config  = this.requestConfig({method: 'DELETE'}, args);
        this.request(config, callback);
    }

    prepare(callback) {
        debug('prepare');
        callback(null, this.toJSON());
    }

    requestConfig(config, args) {
        const retConfig = Object.assign({}, config);

        retConfig.url = this.url(retConfig.url || retConfig.uri, args);

        retConfig.timeout = this.timeout(retConfig.timeout);

        const auth = this.auth(retConfig.auth);
        if (auth) {
            retConfig.username = auth.username || auth.user;
            retConfig.password = auth.password || auth.pass;
        }
        delete retConfig.auth;

        const agent = this.proxy(retConfig.proxy, retConfig.url);
        if (agent) {
            retConfig.agent = agent;
        }
        delete retConfig.proxy;

        const headers = Object.assign({}, this.options.headers, retConfig.headers);
        if (Object.keys(headers).length) retConfig.headers = headers;

        debug('requestConfig', retConfig);

        return retConfig;
    }

    url(url = this.options.url) {
        return url;
    }

    auth(auth = this.options.auth) {
        if (typeof auth === 'string') {
            const splitAuth = auth.split(':');
            auth = {
                username: splitAuth.shift(),
                password: splitAuth.join(':')
            };
        }
        return auth;
    }

    timeout(timeout = this.options.timeout || DEFAULT_TIMEOUT) {
        if (typeof timeout === 'number') {
            timeout = {
                lookup: timeout,
                connect: timeout,
                secureConnect: timeout,
                socket: timeout,
                send: timeout,
                response: timeout
            };
        }
        return timeout;
    }

    proxy(proxy = this.options.proxy, url) {
        if (!proxy || !url) return;

        if (typeof proxy === 'string') proxy = { proxy };

        const isHttps = (new URL(url).protocol === 'https:');

        if (isHttps) {
            const { HttpsProxyAgent } = require('hpagent');
            return {
                https: new HttpsProxyAgent(Object.assign({
                    keepAlive: false,
                    maxSockets: 1,
                    maxFreeSockets: 1,
                }, proxy))
            };
        } else {
            const { HttpProxyAgent } = require('hpagent');
            return {
                http: new HttpProxyAgent(Object.assign({
                    keepAlive: false,
                    maxSockets: 1,
                    maxFreeSockets: 1,
                }, proxy))
            };
        }
    }

    request(settings, callback) {
        this.hookSync({settings});
        this.logSync({settings});
        this.emit('sync', settings);

        let responseTime;
        const startTime = process.hrtime.bigint();
        const setResponseTime = () => {
            const endTime = process.hrtime.bigint();
            responseTime = Number((Number(endTime - startTime) / 1000000).toFixed(3));
        };

        const _callback = (err, data, statusCode) => {
            if (err) {
                this.hookFail({settings, statusCode, responseTime, err, data});
                this.logError({settings, statusCode, responseTime, err, data});
                this.emit('fail', err, data, settings, statusCode, responseTime);
            } else {
                this.hookSuccess({data, settings, statusCode, responseTime});
                this.logSuccess({settings, statusCode, responseTime});
                this.emit('success', data, settings, statusCode, responseTime);
            }
            if (typeof callback === 'function') {
                callback(err, data, responseTime);
            }
        };

        this.got(settings)
            .catch(err => {
                debug('request got error', err);
                setResponseTime();
                if (err.code === 'ETIMEDOUT') {
                    err.message = 'Connection timed out';
                    err.status = 504;
                }
                err.status = err.status || (err.response && err.response.statusCode) || 503;
                return _callback(err, null, err.status, err.response);
            })
            .then(response => {
                debug('request got response', response);
                setResponseTime();
                this.handleResponse(response, _callback);
            });
    }

    handleResponse(response, callback) {
        debug('handleResponse', response);
        let data;
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
        debug('parseResponse', statusCode, data);

        if (statusCode >= 400) {
            const error = this.parseError(statusCode, data);
            return callback(error, data, statusCode);
        }

        try {
            data = this.parse(data);
        } catch (err) {
            return callback(err, null, statusCode);
        }

        callback(null, data, statusCode);
    }

    parse(data) {
        debug('parse', data);
        if (data && typeof data === 'object') this.set(data);
        return data;
    }

    parseError(statusCode, data) {
        debug('parseError, statusCode, data');
        return Object.assign({ status: statusCode }, data);
    }

    logMeta(tokenData) {
        let data = {
            outVerb: tokenData.settings.method,
            outRequest: tokenData.settings.url
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

        Object.assign(data, this.options.logging);

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

    hookSync() {
        if (this.options.hooks && typeof this.options.hooks.sync === 'function') {
            this.options.hooks.sync.apply(this, arguments);
        }
    }

    hookSuccess() {
        if (this.options.hooks && typeof this.options.hooks.success === 'function') {
            this.options.hooks.success.apply(this, arguments);
        }
    }

    hookFail() {
        if (this.options.hooks && typeof this.options.hooks.fail === 'function') {
            this.options.hooks.fail.apply(this, arguments);
        }
    }
}

module.exports = RemoteModel;
