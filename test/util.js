'use strict';
const client = require('mongodb').MongoClient;
const dbUrl = 'mongodb://localhost:27017/acl_test';
const Bluebird = require('bluebird');
const log = require('../lib/log');
module.exports = {
  dbUrl,
  testUrl: 'mongodb://localhost:27017/acl_test_two',
  cleanup: function* () {
    let db = yield client.connect(dbUrl);
    let collections = yield db.collections();
    let dropCollection = yield collections.map(col => {
      if (col.s.name.indexOf('system') > -1) {
        return null;
      }
      log.info(`Dropping collection -  ${col.s.name}`);
      return col.drop();
    });
    return Bluebird.all(dropCollection.filter(x => x));
  }
};