'use strict';
const { expect } = require('chai');

describe('hmpo-model', () => {

    let HmpoModel, hmpoModel, LocalModel, RemoteModel;

    beforeEach(() => {
        HmpoModel = require('../index');
        hmpoModel = new HmpoModel();

        LocalModel = require('../lib/local-model');
        RemoteModel = require('../lib/remote-model');
    });

    it('should be an instance of Remote Model', () => {
        hmpoModel.should.be.an.instanceOf(RemoteModel);
    });

    it('export a localModel', () => {
        expect(HmpoModel.Local).to.equal(LocalModel);
    });

    it('export a remoteModel', () => {
        expect(HmpoModel.Remote).to.equal(RemoteModel);
    });
});
