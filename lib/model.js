'use strict';

const _ = require('lodash');
const request = require('request');
const url = require('url');
const EventEmitter = require('events').EventEmitter;

function timeDiff(from, to, digits) {
  if (digits === undefined) {
    digits = 3;
  }
  let ms = (to[0] - from[0]) * 1e3 + (to[1] - from[1]) * 1e-6;
  return +ms.toFixed(digits);
}

const urlKeys = Object.keys(url.parse(''));

module.exports = class Model extends EventEmitter {
  constructor(attributes, options) {
    super(attributes, options);
    this.options = options || {};
    this.attributes = {};
    this.set(attributes, {
      silent: true
    });
    this._request = request;
  }

  save(options, callback) {
    if (typeof options === 'function' && arguments.length === 1) {
      callback = options;
      options = {};
    } else if (!options) {
      options = {};
    }

    return this.prepare().then(data => {
      data = JSON.stringify(data);
      const reqConf = this.requestConfig(options);
      reqConf.method = options.method || 'POST';

      reqConf.headers = Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }, reqConf.headers || {});

      return this.request(reqConf, data, callback);
    });
  }

  fetch(options, callback) {
    if (typeof options === 'function' && arguments.length === 1) {
      callback = options;
      options = {};
    } else if (!options) {
      options = {};
    }
    const reqConf = this.requestConfig(options);
    reqConf.method = options.method || 'GET';
    return this.request(reqConf, callback);
  }

  delete(options, callback) {
    if (typeof options === 'function' && arguments.length === 1) {
      callback = options;
      options = {};
    } else if (!options) {
      options = {};
    }
    const reqConf = this.requestConfig(options);
    reqConf.method = options.method || 'DELETE';
    return this.request(reqConf, callback);
  }

  requestConfig(options) {
    var reqConf = this.url(options);
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

    let settings = Object.assign({}, originalSettings);
    settings.timeout = settings.timeout || this.options.timeout;
    settings.uri = settings.uri || settings.url || url.format(settings);
    settings.body = settings.body || body || settings.data;

    settings = _.omit(settings, urlKeys, 'data', 'url');
    this.emit('sync', originalSettings);

    const promise = Promise.resolve().then(() => this.auth()).then((authData) => {
      settings.auth = authData;
      if (typeof settings.auth === 'string') {
        let auth = settings.auth.split(':');
        settings.auth = {
          user: auth.shift(),
          pass: auth.join(':'),
          sendImmediately: true
        };
      }
    })
    .then(() => {
      const startTime = process.hrtime();
      let timeoutTimer;

      return new Promise((resolve, reject) => {

        const _callback = (err, data, statusCode) => {
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }

          const endTime = process.hrtime();
          const responseTime = timeDiff(startTime, endTime);

          if (err) {
            this.emit('fail', err, data, originalSettings, statusCode, responseTime);
          } else {
            this.emit('success', data, originalSettings, statusCode, responseTime);
          }
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        };

        this._request(settings, (err, response) => {

          if (err) {
            if (err.code === 'ETIMEDOUT') {
              err.message = 'Connection timed out';
              err.status = 504;
            }
            err.status = err.status || (response && response.statusCode) || 503;
            return _callback(err, null, err.status);
          }
          return this.handleResponse(response, _callback);
        });
      });

    });

    if (typeof callback === 'function') {
      return promise.then((data) => callback(null, data), callback);
    }
    return promise;
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
    return this.parseResponse(response.statusCode, data, callback);
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

  prepare() {
    return Promise.resolve(this.toJSON());
  }

  parse(data) {
    return data;
  }

  parseError(statusCode, data) {
    return Object.assign({
      status: statusCode
    }, data);
  }

  get(key) {
    return _.cloneDeep(this.attributes[key]);
  }

  set(key, value, options) {
    let attrs = {};

    if (typeof key === 'string') {
      attrs[key] = value;
    } else {
      attrs = key;
      options = value;
    }
    options = options || {};

    const old = this.toJSON();
    const changed = _.pickBy(attrs, (attr, attrKey) => {
      return attr !== old[attrKey];
    });

    Object.assign(this.attributes, attrs);

    if (!options.silent && _.size(changed)) {
      _.each(changed, (changedValue, changedKey) => {
        this.emit('change:' + changedKey, this.get(changedKey), old[changedKey]);
      });
      this.emit('change', changed);
    }

    return this;
  }

  unset(fields, options) {
    options = options || {};
    if (typeof fields === 'string') {
      fields = [fields];
    }

    const old = this.toJSON();
    const changed = fields.reduce((obj, key) => {
      if (old[key] !== undefined) {
        obj[key] = undefined;
        delete this.attributes[key];
      }
      return obj;
    }, {});

    if (!options.silent && _.size(changed)) {
      _.each(changed, (value, key) => {
        this.emit('change:' + key, undefined, old[key]);
      });
      this.emit('change', changed);
    }

    return this;
  }

  increment(property, amount) {
    if (!property || typeof property !== 'string') {
      throw new Error('Trying to increment undefined property');
    }
    const val = this.get(property) || 0;
    amount = amount || 1;
    this.set(property, val + amount);
  }

  reset(options) {
    options = options || {};
    const keys = Object.keys(this.attributes);
    this.attributes = {};
    if (!options.silent) {
      _.each(keys, key => {
        this.emit('change:' + key, undefined);
      });
      this.emit('reset');
    }
  }

  url(options) {
    options = options || {};
    let opts = {};
    if (options.url) {
      opts = url.parse(options.url);
    }
    // passing a host to url.format overrides other options, so remove it
    delete opts.host;
    Object.assign(opts, options);
    return url.format(opts);
  }

  auth() {
    return;
  }

  toJSON() {
    return _.cloneDeep(this.attributes);
  }
};
