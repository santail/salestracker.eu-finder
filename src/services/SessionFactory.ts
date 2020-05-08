'use strict';

const elasticsearch = require('elasticsearch');
const kue = require('kue-scheduler');
const mongojs = require('mongojs')


class SessionFactory {
  private readonly _db;
  private readonly _worker;
  private readonly _scheduler;
  private readonly _elastic;

  constructor() {
    this._db = mongojs(process.env.MONGODB_URI, [
      "offers", "sites", "wishes"
    ]);

    this._worker = kue.createQueue({
      redis: process.env.REDIS_ADDR,
      restore: true,
      worker: true
    });

    this._scheduler = kue.createQueue({
      redis: process.env.REDIS_ADDR,
      restore: true,
      worker: false
    });

    this._elastic = new elasticsearch.Client({
      host: process.env.ELASTICSEARCH_URL,
      log: 'error'
    });
  }

  getDbConnection() {
    return this._db;
  };

  getQueueConnection() {
    return this._worker;
  };

  getSchedulerConnection() {
    return this._scheduler;
  };

  getElasticsearchConnection() {
    return this._elastic;
  };
}

export default new SessionFactory();