'use strict';

const Model = require('../../lib/remote-model');
const ModelError = require('../../lib/model-error');
const BaseModel = require('../../lib/local-model');
const logger = require('hmpo-logger');

const { HttpProxyAgent, HttpsProxyAgent } = require('hpagent');

describe('Remote Model', () => {
    let model, cb, mocks;

    beforeEach(() => {
        model = new Model();

        cb = sinon.stub();

        mocks = {
            config: {
                'key': 'value'
            },
            request: sinon.stub(),
            requestConfig: sinon.stub()
        };

    });

    it('should be an instance of LocalModel', () => {
        model = new Model();

        model.should.be.an.instanceOf(BaseModel);
    });

    describe('constructor', () => {
        let Model;

        beforeEach(() => {
            Model = require('../../lib/remote-model');
            sinon.stub(Model.prototype, 'setLogger');
        });

        it('should call setLogger', () => {
            model = new Model();
            model.setLogger.should.have.been.calledWithExactly();
        });

        it('should set model label name', () => {
            model = new Model();
            model.options.label.should.equal('remote-model');
        });

        afterEach(() => {
            Model.prototype.setLogger.restore();
        });
    });

    describe('setLogger', () => {
        beforeEach(() => {
            sinon.stub(logger, 'get').returns('logger');
        });

        afterEach(() => {
            logger.get.restore();
        });

        it('should set up a new hmpo-logger', () => {
            model = new Model();

            logger.get.should.have.been.calledWithExactly(':remote-model');
            model.logger.should.equal('logger');
        });

        it('should use console log and a trimHtml pass-through if hmpo-logger is not available', () => {
            logger.get.throws(new Error());

            model = new Model();

            model.logger.outbound.should.eql(console.log);
            model.logger.trimHtml.should.be.a('function');
            const html = {};
            model.logger.trimHtml(html).should.equal(html);
        });
    });

    describe('fetch', () => {
        beforeEach(() => {
            sinon.stub(model, 'request');
            sinon.stub(model, 'requestConfig');
        });

        afterEach(() => {
            model.request.restore();
            model.requestConfig.restore();
        });

        it('should use requestConfig', () => {
            model.fetch(cb);

            model.requestConfig.should.have.been.calledWith({
                method: 'GET'
            });
        });

        it('should pass args onto requestConfig', () => {
            model.fetch({ foo: 'bar' }, cb);

            model.requestConfig.should.have.been.calledWithExactly({
                method: 'GET'
            }, { foo: 'bar' });
        });

        it('should call request', () => {
            model.requestConfig.returns(mocks.config);

            model.fetch(cb);

            model.request.should.have.been.calledWith(mocks.config, cb);
        });
    });

    describe('save', () => {
        beforeEach(() => {
            sinon.stub(model, 'request');
            sinon.stub(model, 'requestConfig');
            sinon.stub(model, 'prepare');
        });

        afterEach(() => {
            model.request.restore();
            model.requestConfig.restore();
            model.prepare.restore();
        });

        it('should call prepare', () => {
            model.save(cb);

            model.prepare.should.have.been.calledWithExactly(sinon.match.func);
        });

        it('should call callback with an error', () => {
            let error = new Error('error');
            model.prepare.yields(error);

            model.save(cb);

            cb.should.have.been.calledWith(error);
        });

        context('on prepare success', () => {
            let preparedData;

            beforeEach(() => {
                preparedData = {
                    'object': 'properties'
                };
                model.prepare.yields(null, preparedData);
            });

            it('should use requestConfig', () => {
                model.save(cb);

                model.requestConfig.should.have.been.calledWithExactly({
                    method: 'POST',
                    json: preparedData
                }, undefined);
            });

            it('should pass args onto requestConfig', () => {
                model.save({ foo: 'bar' }, cb);

                model.requestConfig.should.have.been.calledWithExactly({
                    method: 'POST',
                    json: preparedData
                }, { foo: 'bar' });
            });

            it('should call request', () => {
                model.requestConfig.returns(mocks.config);

                model.save(cb);

                model.request.should.have.been.calledWith(mocks.config, cb);
            });
        });

    });

    describe('delete', () => {
        beforeEach(() => {
            sinon.stub(model, 'request');
            sinon.stub(model, 'requestConfig');
        });

        afterEach(() => {
            model.request.restore();
            model.requestConfig.restore();
        });

        it('should use requestConfig', () => {
            model.delete(cb);

            model.requestConfig.should.have.been.calledWith({
                method: 'DELETE'
            });
        });

        it('should pass args onto requestConfig', () => {
            model.delete({ foo: 'bar' }, cb);

            model.requestConfig.should.have.been.calledWithExactly({
                method: 'DELETE'
            }, { foo: 'bar' });
        });

        it('should call request', () => {
            model.requestConfig.returns(mocks.config);

            model.delete(cb);

            model.request.should.have.been.calledWith(mocks.config, cb);
        });
    });

    describe('requestConfig', () => {
        describe('url', () => {
            it('should use url from model options', () => {
                model.options.url = 'https://example.com/options';
                const config = model.requestConfig({
                    'method': 'VERB'
                });

                config.url.should.equal('https://example.com/options');
            });

            it('should use url from request config', () => {
                model.options.url = 'https://example.com/options';
                const config = model.requestConfig({
                    'method': 'VERB',
                    'url': 'https://example.com/config'
                });

                config.url.should.equal('https://example.com/config');
            });

            it('should use url returned by overridden url() method', () => {
                model.options.url = 'https://example.com/options';
                model.url = sinon.stub().returns('https://example.com/overridden');
                const config = model.requestConfig({
                    'method': 'VERB',
                    'url': 'https://example.com/config'
                });
                model.url.should.have.been.calledWithExactly('https://example.com/config', undefined);
                config.url.should.equal('https://example.com/overridden');
            });

            it('should pass args onto url method', () => {
                model.url = sinon.stub().returns('https://example.com/overridden');
                const config = model.requestConfig({
                    'method': 'VERB',
                    'url': 'https://example.com/config'
                }, { foo: 'bar' });
                model.url.should.have.been.calledWithExactly('https://example.com/config', { foo: 'bar' });
                config.url.should.equal('https://example.com/overridden');
            });
        });

        describe('auth', () => {
            it('should use auth from model options', () => {
                model.options.auth = 'options:pass:word';
                const config = model.requestConfig({
                    'method': 'VERB'
                });

                config.username.should.equal('options');
                config.password.should.equal('pass:word');
                config.should.not.have.property('auth');
            });

            it('should use auth from config', () => {
                model.options.auth = 'options:pass:word';
                const config = model.requestConfig({
                    'method': 'VERB',
                    'auth': 'config:pass:word'
                });

                config.username.should.equal('config');
                config.password.should.equal('pass:word');
                config.should.not.have.property('auth');
            });

            it('should use auth from overidden auth() method', () => {
                model.options.auth = 'options:pass:word';
                model.auth = sinon.stub().returns({ user: 'overridden', pass: 'pass:word' });
                const config = model.requestConfig({
                    'method': 'VERB',
                    'auth': 'config:pass:word'
                });

                model.auth.should.have.been.calledWithExactly('config:pass:word');
                config.username.should.equal('overridden');
                config.password.should.equal('pass:word');
                config.should.not.have.property('auth');
            });
        });

        describe('timeout', () => {
            it('should use a default timeout', () => {
                const config = model.requestConfig({
                    'method': 'VERB'
                });

                config.should.deep.include({
                    timeout: {
                        connect: 60000,
                        lookup: 60000,
                        response: 60000,
                        secureConnect: 60000,
                        send: 60000,
                        socket: 60000
                    }
                });
            });

            it('should use timeout from model options', () => {
                model.options.timeout = 1000;
                const config = model.requestConfig({
                    'method': 'VERB'
                });

                config.should.deep.include({
                    timeout: {
                        connect: 1000,
                        lookup: 1000,
                        response: 1000,
                        secureConnect: 1000,
                        send: 1000,
                        socket: 1000
                    }
                });
            });

            it('should use timeout from config', () => {
                model.options.timeout = 1000;
                const config = model.requestConfig({
                    'method': 'VERB',
                    'timeout': 2000
                });

                config.should.deep.include({
                    timeout: {
                        connect: 2000,
                        lookup: 2000,
                        response: 2000,
                        secureConnect: 2000,
                        send: 2000,
                        socket: 2000
                    }
                });
            });

            it('should use timeout from specified object', () => {
                const config = model.requestConfig({
                    'method': 'VERB',
                    'timeout': { connect: 3000 }
                });

                config.should.deep.include({
                    timeout: {
                        connect: 3000,
                    }
                });
            });

            it('should use timeout from overidden timeout() method', () => {
                model.timeout = sinon.stub().returns({ connect: 4000 });
                const config = model.requestConfig({
                    'method': 'VERB',
                    'timeout': 2000
                });

                model.timeout.should.have.been.calledWithExactly(2000);
                config.should.deep.include({
                    timeout: {
                        connect: 4000,
                    }
                });
            });
        });

        describe('proxy', () => {
            it('should not set up http proxy if there is no url', () => {
                const returnedConfig = model.requestConfig({
                    'method': 'VERB',
                    'proxy': 'http://proxy.example.com:8000'
                });

                returnedConfig.should.not.have.property('proxy');
                returnedConfig.should.not.have.property('agent');
            });

            it('should set up http proxy if specified', () => {
                const returnedConfig = model.requestConfig({
                    'method': 'VERB',
                    'url': 'http://example.net',
                    'proxy': 'http://proxy.example.com:8000'
                });

                sinon.assert.match(returnedConfig, {
                    agent: {
                        http: sinon.match.instanceOf(HttpProxyAgent)
                    }
                });
            });

            it('should set up https proxy if specified', () => {
                const returnedConfig = model.requestConfig({
                    'method': 'VERB',
                    'url': 'https://example.net',
                    'proxy': 'http://proxy.example.com:8000'
                });

                sinon.assert.match(returnedConfig, {
                    agent: {
                        https: sinon.match.instanceOf(HttpsProxyAgent)
                    }
                });
            });

            it('should pass proxy options to the new proxy', () => {
                const returnedConfig = model.requestConfig({
                    'method': 'VERB',
                    'url': 'http://example.net',
                    'proxy': {
                        proxy: 'http://proxy.example.com:8000',
                        keepAlive: true
                    }
                });

                sinon.assert.match(returnedConfig, {
                    agent: {
                        http: {
                            keepAlive: true
                        }
                    }
                });
            });
        });

        describe('with headers supplied into the constructor', () => {
            let constructorOptions;

            beforeEach(() => {
                constructorOptions = {
                    headers: {
                        'X-Constructor': 'Constructor'
                    }
                };

                model = new Model(null, constructorOptions);

                sinon.stub(model, 'url');
                sinon.stub(model, 'auth');
            });

            it('should use headers in constructor if there are no configured headers', () => {
                let returnedConfig = model.requestConfig({
                    method: 'GET'
                });

                returnedConfig.should.have.property('headers').that.deep.equals({
                    'X-Constructor': 'Constructor'
                });
            });

            it('should combine headers in options with headers in config', () => {
                let returnedConfig = model.requestConfig({
                    method: 'GET',
                    headers: {
                        'X-Header': 'Config'
                    }
                });

                returnedConfig.should.have.property('headers').that.deep.equals({
                    'X-Header': 'Config',
                    'X-Constructor': 'Constructor'
                });
            });

            it('should override headers from the constructor with headers from config', () => {
                let returnedConfig = model.requestConfig({
                    method: 'GET',
                    headers: {
                        'X-Constructor': 'Config'
                    }
                });

                returnedConfig.should.have.property('headers').that.deep.equals({
                    'X-Constructor': 'Config'
                });
            });

            it('should not mutate the constructor options', () => {
                model.requestConfig({
                    method: 'GET',
                    headers: {
                        'X-Header': 'Config'
                    }
                });

                constructorOptions.headers.should.deep.equal({
                    'X-Constructor': 'Constructor'
                });
            });
        });


        it('should have no headers if not supplied', () => {
            let returnedConfig = model.requestConfig({
                'method': 'VERB'
            });

            returnedConfig.should.not.have.property('headers');
        });

        it('should have headers if supplied', () => {
            let returnedConfig = model.requestConfig({
                method: 'GET',
                headers: {
                    'X-Header': 'Value'
                }
            });

            returnedConfig.should.have.property('headers').that.deep.equals({
                'X-Header': 'Value'
            });
        });

        it('should not mutate original parameters', () => {
            let config = {
                method: 'GET',
                headers: {
                    'X-Header': 'Value'
                }
            };

            let savedConfig = Object.assign({}, config);

            let returnedConfig = model.requestConfig(config);

            returnedConfig.should.not.equal(config);
            config.should.eql(savedConfig);

        });
    });

    describe('request', () => {
        let settings, requestSettings, mocks;

        beforeEach(() => {
            mocks = {};
            mocks.got = sinon.stub().returns(mocks);
            mocks.then = sinon.stub().returns(mocks);
            mocks.catch = sinon.stub().returns(mocks);
            model = new Model();
            model.got = mocks.got;

            sinon.stub(model, 'logSync');
            sinon.stub(model, 'logSuccess');
            sinon.stub(model, 'logError');
            sinon.stub(model, 'emit');

            settings = {
                method: 'VERB'
            };

            requestSettings = Object.assign({}, settings);
        });

        afterEach(() => {
            model.logSync.restore();
            model.logSuccess.restore();
            model.logError.restore();
            model.emit.restore();
        });

        it('should invoke request with request settings', () => {
            model.request(settings, cb);

            mocks.got.should.have.been.called;
            mocks.got.should.have.been.calledWith(requestSettings);
        });

        it('should log sync messages', () => {
            model.request(settings, cb);

            model.logSync.should.have.been.calledWithExactly({
                settings: settings
            });
        });

        it('should emit a sync event', () => {
            model.request(settings, cb);

            model.emit.should.have.been.calledWithExactly(
                'sync',
                settings
            );
        });

        it('should fire sync hook', () => {
            let hook = sinon.stub();
            model.options.hooks = { sync: hook };
            model.request(settings, cb);

            hook.should.have.been.calledWithExactly({
                settings: settings
            });
            hook.should.have.been.calledOn(model);
        });

        it('should work without a callback', () => {
            mocks.catch.yields(new Error('Random Error'));

            model.request(settings);

            model.logSync.should.have.been.calledOnce;
            model.logError.should.have.been.calledOnce;

        });

        context('on error', () => {
            let error, response;

            beforeEach(() => {
                error = new Error('Lorem Ipsum');
                response = {
                    'body': JSON.stringify({'data': 'value'}),
                    'statusCode': 418
                };

                error.response = response;

                mocks.catch.yields(error);
            });

            it('should log error messages', () => {
                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 418,
                    responseTime: sinon.match.number,
                    err: sinon.match.instanceOf(ModelError),
                    data: null
                });
                model.logError.args[0][0].err.should.include({
                    name: 'Error',
                    message: 'Error: Lorem Ipsum',
                    status: 418,
                    info: undefined,
                });
                model.logError.args[0][0].err.stack.should.be.a('string');
            });

            it('should emit a fail event', () => {
                model.request(settings, cb);

                model.emit.should.have.been.calledWithExactly(
                    'fail',
                    sinon.match.instanceOf(ModelError),
                    null,
                    settings,
                    418,
                    sinon.match.number
                );
                model.emit.args[1][1].should.include({
                    name: 'Error',
                    message: 'Error: Lorem Ipsum',
                    status: 418,
                });
            });

            it('should translate timeout errors with status codes', () => {
                error.code = 'ETIMEDOUT';

                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 504,
                    responseTime: sinon.match.number,
                    err: sinon.match.instanceOf(ModelError),
                    data: null
                });
                model.logError.args[0][0].err.should.include({
                    name: 'Error',
                    message: 'Connection timed out',
                    status: 504
                });
            });

            it('should translate errors without status codes', () => {
                delete response.statusCode;

                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 503,
                    responseTime: sinon.match.number,
                    err: sinon.match.instanceOf(ModelError),
                    data: null
                });
                model.logError.args[0][0].err.should.include({
                    name: 'Error',
                    message: 'Error: Lorem Ipsum',
                    status: 503
                });
            });

            it('should fire fail hook', () => {
                let hook = sinon.stub();
                model.options.hooks = { fail: hook };

                model.request(settings, cb);

                hook.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 418,
                    responseTime: sinon.match.number,
                    err: sinon.match.instanceOf(ModelError),
                    data: null
                });
                hook.should.have.been.calledOn(model);
            });

            it('should handle response for ERR_NON_2XX_3XX_RESPONSE errors', () => {
                error.code = 'ERR_NON_2XX_3XX_RESPONSE';
                error.response = {
                    'body': JSON.stringify({'data': 'value'}),
                    'statusCode': 404
                };

                model.request(settings, cb);
                console.log(model.logError.args[0][0]);
                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 404,
                    responseTime: sinon.match.number,
                    err: {
                        status: 404,
                        data: 'value'
                    },
                    data: { data: 'value' }
                });

                cb.should.have.been.calledWithExactly(
                    {
                        status: 404,
                        data: 'value'
                    },
                    {
                        data: 'value'
                    },
                    sinon.match.number
                );
            });

        });

        context('on success', () => {
            beforeEach(() => {
                mocks.then.yields({
                    'body': JSON.stringify({'data': 'value'}),
                    'statusCode': 200
                });
            });

            it('should log success messages', () => {
                model.request(settings, cb);

                model.logSuccess.should.have.been.calledWithExactly({
                    statusCode: 200,
                    settings: settings,
                    responseTime: sinon.match.number
                });
            });

            it('should emit a success event', () => {
                model.request(settings, cb);

                model.emit.should.have.been.calledWithExactly(
                    'success',
                    {'data': 'value'},
                    settings,
                    200,
                    sinon.match.number
                );
            });

            it('should fire success hook', () => {
                let hook = sinon.stub();
                model.options.hooks = { success: hook };
                model.request(settings, cb);

                hook.should.have.been.calledWithExactly({
                    data: {'data': 'value'},
                    statusCode: 200,
                    settings: settings,
                    responseTime: sinon.match.number
                });
                hook.should.have.been.calledOn(model);
            });
        });
    });

    describe('handleResponse', () => {
        beforeEach(() => {
            sinon.stub(model, 'parseResponse');
        });

        afterEach(() => {
            model.parseResponse.restore();
        });

        it('should invoke callback on parsing error', () => {
            let data = {
                statusCode: 418,
                body: 'Fish'
            };

            model.handleResponse(data, cb);

            cb.should.have.been.calledWith(sinon.match.instanceOf(SyntaxError), null, 418);
            cb.firstCall.args[0].should.include({
                status: data.statusCode,
                body: data.body
            });
        });

        it('should invoke parseResponse on parsing success', () => {
            let data = {
                statusCode: 418,
                body: JSON.stringify({'key': 'value'})
            };

            model.handleResponse(data, cb);

            model.parseResponse.should.have.been.calledWith(
                418,
                {'key': 'value'},
                cb
            );

        });

        it('should invoke parseResponse on an empty body',  () => {
            let data = {
                statusCode: 418
            };

            model.handleResponse(data, cb);

            model.parseResponse.should.have.been.calledWith(
                418,
                {},
                cb
            );
        });
    });

    describe('parseResponse', () => {
        beforeEach(() => {
            sinon.stub(model, 'parse').returns({ parsed: 'true' });
            sinon.stub(model, 'parseError').returns({ error: 'true' });
        });

        afterEach(() => {
            model.parse.restore();

            model.parseError.restore();
        });

        it('sends response bodies with "success" status codes to parse', function (done) {
            model.parseResponse(200, { parsed: 'false' }, function (err, data, statusCode) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledWith({ parsed: 'false' });
                data.should.eql({ parsed: 'true' });
                statusCode.should.equal(200);
                done();
            });
        });

        it('sends response bodies with "failure" status codes to parseError', function (done) {
            model.parseResponse(400, { parsed: 'false' }, function (err, data, statusCode) {
                err.should.eql({ error: 'true' });
                data.should.eql({ parsed: 'false' });
                statusCode.should.equal(400);
                done();
            });
        });

        it('invokes callback with error on parsing error', () => {
            let err = new Error('Parsing Error');
            model.parse.throws(err);

            model.parseResponse(200, { parsed: 'false' }, cb);

            cb.should.have.been.calledWith(err, null, 200);
        });

    });

    describe('prepare', () => {

        beforeEach(() => {
            sinon.stub(model, 'toJSON').returns( {name: 'Test name'} );
        });

        afterEach(() => {
            model.toJSON.restore();
        });

        it('returns JSON data', () => {

            let cb = sinon.stub();
            model.prepare(cb);
            cb.should.have.been.calledOnce;
            cb.should.have.been.calledWith(null, {
                name: 'Test name'
            });
        });
    });

    describe('url', () => {
        it('should return undefined by default', () => {
            let url = model.url();

            expect(url).to.be.undefined;
        });

        it('should return a url from options', () => {
            model.options.url = 'http://www.example.com';
            let url = model.url();

            url.should.equal('http://www.example.com');
        });
    });

    describe('parse', () => {
        it('returns data passed', () => {
            model.parse({ data: 1 }).should.eql({ data: 1 });
        });

        it('sets the parsed data to the model', () => {
            model.parse({ foo: 'bar' });
            model.get('foo').should.equal('bar');
        });

        it('sets the parsed array data to the model as "data"', () => {
            model.parse([1, 2, 3, 4]);
            model.get('data').should.eql([1, 2, 3, 4]);
        });

        it('does not set if the data falsey', () => {
            model.set = sinon.stub();
            model.parse(null);
            model.set.should.not.have.been.called;
        });
    });

    describe('parseError', () => {
        it('returns data passed extended with the status code', () => {
            let parsedError = model.parseError(400, {
                data: 'message',
                nested: {
                    key: 'value'
                }
            });

            parsedError.should.eql({
                status: 400,
                data: 'message',
                nested: {
                    key: 'value'
                }
            });
        });
    });

    describe('auth', () => {
        it('should return undefined with no credentials', () => {
            let credentials = model.auth();

            expect(credentials).to.be.undefined;
        });

        it('should return parsed credentials if credentials is a string', () => {
            let credentials = model.auth('username:pass:word');

            credentials.should.deep.equal({
                username: 'username',
                password: 'pass:word'
            });

        });

        it('should return credentials if credentials is an object', () => {
            let credentials = model.auth({
                key: 'value'
            });

            credentials.should.deep.equal({
                key: 'value'
            });
        });
    });



    describe('logging', () => {
        let mocks;

        beforeEach(() => {
            mocks = {
                outbound: sinon.stub(),
                trimHtml: sinon.stub()
            };
            sinon.stub(logger, 'get').returns(mocks);

            model = new Model();

        });

        afterEach(() => {
            logger.get.restore();
        });

        describe('logSync', () => {
            it('should call logger.outbound', () => {
                let args = {
                    settings: {
                        method: 'VERB',
                        url: 'http://example.org'
                    }
                };

                let argsAsMeta = {
                    outVerb: 'VERB',
                    outRequest: 'http://example.org'
                };

                model.logSync(args);

                mocks.outbound.should.have.been.calledWithExactly(
                    'Model request sent :outVerb :outRequest',
                    argsAsMeta
                );
            });
        });

        describe('logError', () => {
            it('should call logger.outbound', () => {
                let args = {
                    settings: {
                        method: 'VERB',
                        url: 'http://example.org'
                    },
                    statusCode: 418,
                    responseTime: 1000
                };

                let argsAsMeta = {
                    outVerb: 'VERB',
                    outRequest: 'http://example.org',
                    outResponseCode: 418,
                    outResponseTime: 1000
                };

                model.logError(args);

                mocks.outbound.should.have.been.calledWithExactly(
                    'Model request failed :outVerb :outRequest :outResponseCode :outError',
                    argsAsMeta
                );
            });
        });

        describe('logSuccess', () => {
            it('should call logger.outbound', () => {
                let args = {
                    settings: {
                        method: 'VERB',
                        url: 'http://example.org'
                    },
                    statusCode: 418,
                    responseTime: 1000
                };

                let argsAsMeta = {
                    outVerb: 'VERB',
                    outRequest: 'http://example.org',
                    outResponseCode: 418,
                    outResponseTime: 1000
                };

                model.logSuccess(args);

                mocks.outbound.should.have.been.calledWithExactly(
                    'Model request success :outVerb :outRequest :outResponseCode',
                    argsAsMeta
                );
            });

        });

        describe('logMeta', () => {
            let data;

            beforeEach(() => {
                data = {
                    settings: {
                        method: 'VERB',
                        url: 'http://example.org'
                    },
                    statusCode: 418,
                    responseTime: 3000,
                    err: {
                        message: 'Err Message',
                        body: 'Err Body'
                    },
                    data: {
                        error: 'Data Error',
                        errors: 'Data Errors'
                    }
                };
            });

            it('should transform sync data', () => {
                let result = model.logMeta(data);

                result.should.include({
                    outVerb: 'VERB',
                    outRequest: 'http://example.org'
                });
            });

            it('should transform response data', () => {
                let result = model.logMeta(data);

                result.should.include({
                    outVerb: 'VERB',
                    outRequest: 'http://example.org',
                    outResponseCode: 418,
                    outResponseTime: 3000
                });
            });


            context('outError', () => {
                it('should prefer error.message', () => {
                    let result = model.logMeta(data);

                    result.should.have.property('outError').that.equals(
                        'Err Message'
                    );
                });
                it('should fallback to use data.error', () => {
                    delete data.err;

                    let result = model.logMeta(data);

                    result.should.have.property('outError').that.equals(
                        'Data Error'
                    );
                });
                it('should fallback to use data.errors', () => {
                    delete data.err;
                    delete data.data.error;

                    let result = model.logMeta(data);

                    result.should.have.property('outError').that.equals(
                        'Data Errors'
                    );
                });
            });

            context('outErrorBody', () => {
                it('should not be present without error', () => {
                    delete data.err;

                    let result = model.logMeta(data);

                    result.should.not.have.property('outErrorBody');
                });

                it('should be present with error', () => {
                    mocks.trimHtml.returns('Html Body');

                    let result = model.logMeta(data);

                    result.should.have.property('outErrorBody').that.equals(
                        'Html Body'
                    );
                });
            });

        });

    });
});
