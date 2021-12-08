
class ModelError extends Error {
    constructor(e) {
        super(e);
        Object.defineProperties(this, {
            original: {
                value: e,
                enumerable: false,
                writable: false,
                configurable: true,
            },
            name: {
                value: e.name,
                enumerable: false,
                writable: true,
                configurable: true,
            },
            code: {
                value: e.code,
                enumerable: false,
                writable: true,
                configurable: true,
            },
            errno: {
                value: e.errno,
                enumerable: false,
                writable: true,
                configurable: true,
            },
            info: {
                get: () => this.original.info,
                enumerable: false,
                configurable: true
            },
            stack: {
                get: () => this.original.stack,
                enumerable: false,
                configurable: true
            },
        });
        this.code = e.code;

        if (this.code === 'ETIMEDOUT') {
            this.message = 'Connection timed out';
            this.status = 504;
        }
        this.status = this.status || (e.response && e.response.statusCode) || 503;
    }
}

module.exports = ModelError;
