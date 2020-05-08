import * as elasticsearch from 'elasticsearch';
import scheduler from 'kue-scheduler';
import mongojs from 'mongojs';


class SessionFactory {
  private readonly _db;
  private readonly _worker;
  private readonly _scheduler;
  private readonly _elastic;

  constructor() {
    this._db = mongojs(process.env.MONGODB_URI, [
      'offers', 'sites', 'wishes'
    ]);

    this._worker = scheduler.createQueue({
      redis: {
        host: process.env.REDIS_ADDR!!,
        port: parseInt(process.env.REDIS_PORT!!, 10)
      },
      restore: true,
      worker: true
    });

    this._scheduler = scheduler.createQueue({
      redis: {
        host: process.env.REDIS_ADDR!!,
        port: parseInt(process.env.REDIS_PORT!!, 10)
      },
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
  }

  getQueueConnection() {
    return this._worker;
  }

  getSchedulerConnection() {
    return this._scheduler;
  }

  getElasticsearchConnection() {
    return this._elastic;
  }
}

export default new SessionFactory();