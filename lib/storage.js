'use strict';
const Bluebird = require('bluebird');
const R = require('ramda');
const EventEmiiter = require('events');
const Enums = require('./enum');
const ACLError = require('./error');

class Storage extends EventEmiiter {
  constructor(type) {
    super();
    let _self = this;
    _self.status = 0;
    _self._type = type || '';
  }
  get containers() {
    return Enums.container[this._type] || null;
  }
  init() {
    if (this.isActive) {
      if (this._type === 'mongo') {
        return Bluebird.reject(new ACLError('MONGO_ACTIVE_CONNECTION'));
      }
      return Bluebird.reject(new ACLError('ACTIVE_CONNECTION'));
    }
    if (this._connect && R.is(Function, this._connect)) {
      return this._connect();
    }
    return Bluebird.reject(new ACLError('GENERAL', `Could not initialize storage - ${this._type}`));
  }
  get isActive() {
    return this.status > 0 ? true : false;
  }
  _onConnected() {
    this.emit('ready');
  }
  _onError(err) {
    this.emit('error', err);
  }
  _onClean() {
    this.emit('clean');
  }
  clean() {
    let _self = this;
    let args = arguments;
    return Bluebird
      .resolve(_self.isActive)
      .then(() => {
        let err = new ACLError('GENERAL', 'No active storage found to clean.');
        if (_self.isActive) {
          let clean = (_self._clean || _self._close);
          err = new ACLError('GENERAL', 'No clean implementation found.');
          if (R.is(Function, clean)) {
            return clean.apply(_self, args);
          }
          return Bluebird.reject(err);
        }
        return Bluebird.reject(err);
      })
      .then(() => _self._onClean())
      .catch(err => {
        this.emit('error', err);
        return Bluebird.reject(err);
      });
  }
}

module.exports = Storage;