'use strict';

const proxyquire = require('proxyquire');
const BaseModel = require('../../lib/local-model');
const _ = require('underscore');

describe('Remote Model', () => {
    let model, Model, cb, mocks;

    beforeEach(() => {
        Model = require('../../lib/remote-model');
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
        Model = require('../../lib/remote-model');
        model = new Model();

        model.should.be.an.instanceOf(BaseModel);
    });

    describe('constructor', () => {

        it('should call setLogger', () => {
            let Model = require('../../lib/remote-model');
            sinon.stub(Model.prototype, 'setLogger');

            model = new Model();

            model.setLogger.should.have.been.calledWithExactly();
        });

        afterEach(() => {
            Model.prototype.setLogger.restore();
        });
    });

    describe('setLogger', () => {
        let getStub = sinon.stub();
        let Model = proxyquire('../../lib/remote-model', {
            'hmpo-logger': {
                get: getStub
            }
        });

        model = new Model();

        getStub.should.have.been.calledWithExactly(':remote-model');
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

            model.prepare.should.have.been.called;

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

                model.requestConfig.should.have.been.calledWith({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(JSON.stringify(preparedData))
                    }
                });
            });
            it('should call request', () => {
                model.requestConfig.returns(mocks.config);

                model.save(cb);

                model.request.should.have.been.calledWith(mocks.config, JSON.stringify(preparedData), cb);
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
        it('should call request', () => {
            model.requestConfig.returns(mocks.config);

            model.delete(cb);

            model.request.should.have.been.calledWith(mocks.config, cb);
        });
    });

    describe('requestConfig', () => {
        beforeEach(() => {
            sinon.stub(model, 'url');
            sinon.stub(model, 'auth');

            model.url.returns('http://example.net');
        });

        afterEach(() => {
            model.url.restore();
            model.auth.restore();
        });


        it('should use url', () => {
            model.requestConfig({
                'method': 'VERB'
            });

            model.url.should.have.been.calledWithExactly();
        });

        it('should use auth', () => {
            model.requestConfig({
                'method': 'VERB'
            });

            model.auth.should.have.been.calledWithExactly();
        });

        it('should add auth to config if provided', () => {
            model.auth.returns({
                user: 'username',
                pass: 'password'
            });

            let returnedConfig = model.requestConfig({
                'method': 'VERB'
            });

            returnedConfig.should.deep.include({
                auth: {
                    user: 'username',
                    pass: 'password'
                }
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

            let savedConfig = _.clone(config);

            let returnedConfig = model.requestConfig(config);

            returnedConfig.should.not.equal(config);
            config.should.eql(savedConfig);

        });
    });

    describe('request', () => {
        let settings, body, requestSettings;

        beforeEach(() => {
            let Model = proxyquire('../../lib/remote-model', {
                'request': mocks.request
            });

            model = new Model();

            sinon.stub(model, 'logSync');
            sinon.stub(model, 'logSuccess');
            sinon.stub(model, 'logError');
            sinon.stub(model, 'emit');

            settings = {
                method: 'VERB'
            };

            requestSettings = _.clone(settings);
        });

        afterEach(() => {
            model.logSync.restore();
            model.logSuccess.restore();
            model.logError.restore();
            model.emit.restore();
        });

        it('should invoke request with settings including a body', () => {
            requestSettings.body = body;

            model.request(settings, body, cb);

            mocks.request.should.have.been.called;
            mocks.request.should.have.been.calledWith(requestSettings);
        });

        it('should invoke request with request settings', () => {
            requestSettings.body = undefined;

            model.request(settings, cb);

            mocks.request.should.have.been.called;
            mocks.request.should.have.been.calledWith(requestSettings);
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
            mocks.request.yields(new Error('Random Error'), {});

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

                mocks.request.yields(error, response);
            });

            it('should log error messages', () => {
                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 418,
                    responseTime: sinon.match.number,
                    err: error,
                    data: null
                });
            });

            it('should emit a fail event', () => {
                model.request(settings, cb);

                model.emit.should.have.been.calledWithExactly(
                    'fail',
                    sinon.match({
                        message: error.message,
                        status: 418
                    }),
                    null,
                    settings,
                    418,
                    sinon.match.number
                );
            });

            it('should translate timeout errors with status codes', () => {
                error.code = 'ETIMEDOUT';

                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 504,
                    responseTime: sinon.match.number,
                    err: sinon.match({
                        message: 'Connection timed out'
                    }),
                    data: null
                });
            });

            it('should translate errors without status codes', () => {
                delete response.statusCode;

                model.request(settings, cb);

                model.logError.should.have.been.calledWithExactly({
                    settings: settings,
                    statusCode: 503,
                    responseTime: sinon.match.number,
                    err: sinon.match({
                        message: error.message,
                        status: 503,
                    }),
                    data: null
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
                    err: error,
                    data: null
                });
                hook.should.have.been.calledOn(model);
            });
        });

        context('on success', () => {
            beforeEach(() => {
                mocks.request.yields(null, {
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
            let credentials = model.auth('username:password');

            credentials.should.deep.equal({
                user: 'username',
                pass: 'password',
                sendImmediately: true
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
        let logger;

        beforeEach(() => {
            logger = {
                outbound: sinon.stub(),
                trimHtml: sinon.stub()
            };

            let Model = proxyquire('../../lib/remote-model', {
                'hmpo-logger': {
                    get: () => logger,
                }
            });

            model = new Model();
        });

        describe('logSync', () => {
            it('should call logger.outbound', () => {
                let args = {
                    settings: {
                        method: 'VERB',
                        uri: 'http://example.org'
                    }
                };

                let argsAsMeta = {
                    outVerb: 'VERB',
                    outRequest: 'http://example.org'
                };

                model.logSync(args);

                logger.outbound.should.have.been.calledWithExactly(
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
                        uri: 'http://example.org'
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

                logger.outbound.should.have.been.calledWithExactly(
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
                        uri: 'http://example.org'
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

                logger.outbound.should.have.been.calledWithExactly(
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
                        uri: 'http://example.org'
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
                    logger.trimHtml.returns('Html Body');

                    let result = model.logMeta(data);

                    result.should.have.property('outErrorBody').that.equals(
                        'Html Body'
                    );
                });
            });

        });

    });
});
