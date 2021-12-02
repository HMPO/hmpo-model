'use strict';

const EventEmitter = require('events').EventEmitter;

class LocalModel extends EventEmitter {

    constructor(attributes, options) {
        super();

        this.options = options || {};
        this.attributes = Object.create(null);
        if (attributes) this.set(attributes, {silent: true});
    }

    get(key) {
        return this.attributes[key];
    }

    set(key, value, options) {

        let attrs = Object.create(null);
        if (key instanceof Map) {
            Object.assign(attrs, Object.fromEntries(key));
        } else if (typeof key === 'string') {
            attrs[key] = value;
        } else {
            Object.assign(attrs, key);
            options = value;
        }

        // silent set
        if (options && options.silent) {
            Object.assign(this.attributes, attrs);
            return this;
        }

        const changes = [];
        for (let key in attrs) {
            const value = attrs[key];
            const old = this.attributes[key];
            if (value !== old) changes.push([key, value, old]);
        }

        Object.assign(this.attributes, attrs);

        if (changes.length) {
            changes.forEach(([key, value, old]) => this.emit('change:' + key, value, old));
            if (this.listenerCount('change')) this.emit('change', Object.fromEntries(changes));
        }

        return this;
    }


    unset(fields, options) {
        if (typeof fields === 'string') {
            fields = [fields];
        }

        const changes = [];
        for (let key of fields) {
            const old = this.attributes[key];
            if (old !== undefined) {
                changes.push([key, undefined, old]);
                delete this.attributes[key];
            }
        }

        if ((!options || !options.silent) && changes.length) {
            changes.forEach(([key, value, old]) => this.emit('change:' + key, value, old));
            if (this.listenerCount('change')) this.emit('change', Object.fromEntries(changes));
        }

        return this;
    }

    reset(options) {
        const old = this.attributes;
        this.attributes = Object.create(null);
        if (!options || !options.silent) {
            Object.keys(old).forEach(key => this.emit('change:' + key, undefined, old[key]));
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

    toJSON(bare = false) {
        return Object.assign(bare ? Object.create(null) : {}, this.attributes);
    }
}

module.exports = LocalModel;
