const _ = require('lodash');
const mongojs = require('mongojs');
const util = require('util');

import LOG from "./services/Logger";
import SessionFactory from './services/SessionFactory';


const WISH_CHECK_PERIOD = process.env.WISH_CHECK_PERIOD ? parseInt(process.env.WISH_CHECK_PERIOD, 10) : 60 * 60 * 1000;
const DEFAULT_LANGUAGE = 'est';

const performSearch = function () {
    const checkTime = new Date().getTime();

    SessionFactory.getDbConnection().wishes.findOne({
        $and: [{
            expires: {
                "$gte": new Date(checkTime)
            }
        }, {
            $or: [{
                reactivates: {
                    $exists: false
                }
            }, {
                reactivates: {
                    "$lte": new Date(checkTime)
                }
            }]
        }]
    }, (err, foundWish) => {
        if (err) {
            LOG.error(util.format('[ERROR] Checking wish failed', err));
        } else if (foundWish) {
            if (!foundWish.locale) { // we use 'locale' property as 'language' is reserved for mongodb 
                foundWish.locale = DEFAULT_LANGUAGE; // fallback to default language
            }

            foundWish.language = foundWish.locale;
            delete foundWish.locale;

            let indexName = 'salestracker-' + foundWish.language;
            
            let criteria: any[] = [
                [{
                    "match": {
                        "title": foundWish.content
                    }
                }]
            ];

            if (foundWish.last_processed) {
                criteria.push({
                    "range": {
                        "parsed": {
                            "gt": new Date(foundWish.last_processed)
                        }
                    }
                });
            }

            SessionFactory.getElasticsearchConnection().search({
                index: indexName,
                type: 'offers',
                body: {
                    "query": {
                        "bool": {
                            "must": criteria
                        }
                    }
                }
            }, (err, response) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] Offers search failed', foundWish.content, err));
                } else {
                    if (!response.hits.total) {
                        LOG.info(util.format('[OK] No offers containing %s found', foundWish.content, response.hits));

                        _handleEmptyResult(foundWish, checkTime);
                    } else {
                        LOG.info(util.format('[OK] Offers containing %s found', foundWish.content, response.hits));

                        _handleSearchResult(response, foundWish, checkTime);
                    }
                }
            });
        } else {
            LOG.info(util.format('[OK] No unprocessed wishes found'));

            setTimeout(function () {
                performSearch();
            }, 10000)
        }
    });
};

function _handleEmptyResult(wish, checkTime) {
    // nothing found, postpone current wish processing for some interval
    SessionFactory.getDbConnection().wishes.update({
        _id: mongojs.ObjectId(wish._id)
    }, {
        $set: { // TODO add flag with latest found offers create date
            reactivates: new Date(checkTime.getTime() + WISH_CHECK_PERIOD)
        }
    }, function (err, updatedWish) {
        if (err) {
            // TODO Mark somehow wish that was not marked as processed
            LOG.error(util.format('[ERROR] [%s] Wish check time update failed', wish.content, err));
            return performSearch();
        }

        if (!updatedWish) {
            LOG.error(util.format('[ERROR] [%s] Wish check time update failed', wish.content, err));
        } else {
            LOG.info(util.format('[OK] [%s] Wish check time updated', wish.content));
            return performSearch();
        }
    });
}

function _handleSearchResult(response, foundWish, checkTime) {
    let offers = _.map(response.hits.hits, function (offer) {
        return offer._source;
    });

    let latestProcessedOffer = _.maxBy(offers, function (offer) { // TODO probably move this sorting to elastic search query
        return offer.parsed;
    });

    let notification = {
        wish: foundWish,
        offers: offers
    };

    SessionFactory.getQueueConnection().create('sendNotification', notification)
        .attempts(3).backoff({
        delay: 60 * 1000,
        type: 'exponential'
    })
        .removeOnComplete(true)
        .save(function (err) {
            if (err) {
                LOG.error(util.format('[ERROR] Notification processing schedule failed', notification, err));
            }

            LOG.debug(util.format('[OK] Notification processing scheduled'));
        });

    SessionFactory.getDbConnection().wishes.update({
        _id: mongojs.ObjectId(foundWish._id)
    }, {
        $set: { // TODO add flag with latest found offers create date
            reactivates: new Date(checkTime.getTime() + WISH_CHECK_PERIOD),
            last_processed: new Date(latestProcessedOffer.parsed)
        }
    }, function (err, updatedWish) {
        if (err) {
            // TODO Mark somehow wish that was not marked as processed
            LOG.error(util.format('[ERROR] [%s] Wish check time update failed', foundWish.content, err));
            return;
        }

        if (!updatedWish) {
            LOG.error(util.format('[ERROR] [%s] Wish check time update failed', foundWish.content, err));
        } else {
            LOG.info(util.format('[OK] [%s] Wish check time updated', foundWish.content));
            performSearch();
        }
    });
}

performSearch();