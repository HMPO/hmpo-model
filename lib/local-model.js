'use strict';

const _ = require('underscore');
const EventEmitter = require('events').EventEmitter;

class LocalModel extends EventEmitter {

    constructor(attributes, options) {
        super();

        this.options = options || {};
        this.attributes = {};
        this.set(attributes, {silent: true});
    }

    get(key) {
        return this.attributes[key];
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

        let old = this.toJSON(),
            changed = {};

        _.each(attrs, (value, key) => {
            if (value !== old[key]) {
                changed[key] = value;
            }
        });

        _.extend(this.attributes, attrs);

        if (!options.silent && !_.isEmpty(changed)) {
            _.each(changed, (value, key) => {
                this.emit('change:' + key, this.get(key), old[key]);
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
        let old = this.toJSON(),
            changed = {};

        _.each(fields, (key) => {
            if (old[key] !== undefined) {
                changed[key] = undefined;
                delete this.attributes[key];
            }
        });

        if (!options.silent && !_.isEmpty(changed)) {
            _.each(changed, (value, key) => {
                this.emit('change:' + key, undefined, old[key]);
            });
            this.emit('change', changed);
        }

        return this;
    }

    reset(options) {
        options = options || {};
        let keys = Object.keys(this.attributes);
        this.attributes = {};
        if (!options.silent) {
            _.each(keys, (key) => {
                this.emit('change:' + key, undefined);
            });
            this.emit('reset');
        }
    }

    increment(property, amount) {
        if (!property || typeof property !== 'string') {
            throw new Error('Trying to increment undefined property');
        }
        let val = this.get(property) || 0;
        amount = amount || 1;
        this.set(property, val + amount);
    }

    toJSON() {
        return Object.assign({}, this.attributes);
    }
}

module.exports = LocalModel;
