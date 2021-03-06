'use strict';
const Arguments = require('./arguments');
const Bluebird = require('bluebird');
const R = require('ramda');
const ACLError = require('./error');
const util = require('./util');
const Storage = require('./storage');

class Role {
  constructor(storage, roleName) {
    let _self = this;
    let err = new Arguments(arguments).expect('object', 'string');
    if (err && err.length) {
      throw err;
    }
    if (!(storage instanceof Storage)) {
      throw new ACLError('GENERAL', `Invalid storage instance: ${util.inspect(storage)}`);
    }
    _self.roleName = roleName;
    _self.storage = storage;
    _self.containers = storage.containers;
  }
  add() {
    let _self = this;
    let storage = _self.storage;
    let addAction = Bluebird.coroutine(storage.add.bind(storage));
    if (R.isNil(_self.roleName) || R.isEmpty(_self.roleName) || !R.is(String, _self.roleName)) {
      return Bluebird.reject(new ACLError('INVALID_ROLE', util.inspect(_self.roleName)));
    }
    return addAction(_self.containers.ROLE, {
      name: _self.roleName
    });
  }
  details() {
    let _self = this;
    let storage = _self.storage;
    let getRole = Bluebird.coroutine(storage.get.bind(storage));

    return getRole(_self.containers.ROLE, {
      name: _self.roleName
    });
  }
  allow(resource, access) {
    let _self = this;
    let storage = _self.storage;
    let err = new Arguments(arguments).expect('string', 'object');
    if (err && err.length) {
      throw err;
    }
    let allowAccess = Bluebird.coroutine(storage.add.bind(storage));
    let getAccessList = Bluebird.coroutine(storage.get.bind(storage));
    let accessList = {
      create: R.is(Boolean, access.create) ? access.create : false,
      update: R.is(Boolean, access.update) ? access.update : false,
      read: R.is(Boolean, access.read) ? access.read : false,
      delete: R.is(Boolean, access.delete) ? access.delete : false
    };

    return Bluebird.coroutine(function* () {
      let role = yield _self.details();
      if (!role) {
        return Bluebird.reject(new ACLError('ROLE_NOT_FOUND', _self.roleName));
      }
      let access = yield getAccessList(_self.containers.ACCESS, { role: role._id });

      if (!access) {
        let newAccess = {
          role: role._id,
          resources: [R.merge({ resource }, accessList)]
        };

        return yield allowAccess(_self.containers.ACCESS, newAccess);
      }

      let resources = access.resources || [];

      let resourceIndex = R.findIndex(x => x.resource === resource, resources);

      if (resourceIndex >= 0) {
        resources[resourceIndex] = R.merge({ resource }, accessList);
      } else {
        resources.push(R.merge({ resource }, accessList));
      }
      access.resources = resources;
      return allowAccess(_self.containers.ACCESS, access);
    })();
  }
}

module.exports = Role;