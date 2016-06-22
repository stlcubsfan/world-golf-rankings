'use strict';
const promise = require('bluebird');
const _ = require ('lodash');

const options = {
  promiseLib: promise
};

let pgp = require('pg-promise')(options);
const connectionString = (process.env.DATABASE_URL || 'postgres://localhost:5432/worldgolfrankings');
const db = pgp(connectionString);

const XRay = require('x-ray');
const xray = XRay({
  filters: {
    trim: function (value) {
      return typeof value === 'string' ? value.trim() : value;
    },
    removeSpace: function (value) {
      return typeof value === 'string' ? JSON.stringify(value).replace(/[^A-Za-z.'-]/g, ' ') : value;
    },
    toNum: function (value) {
      return Number(value);
    }
  }
});

module.exports = {
  getRankings: getRankings,
  loadRankings: loadRankings,
  deleteRankings: deleteRankings
};

function getRankings(req, res, next) {
  db.any('select rank, golfer from rankings order by rank')
    .then(function (data) {
      res.status(200)
        .json(data);
    })
    .catch(function (error) {
      return next(error);
    });
}

function insertRanking(rank, golfer) {
  return db.none('insert into rankings(rank, golfer) values($1, $2)', [rank, golfer]);
}

function loadRankings(req, res, next) {
  db.none('delete from rankings')
    .then(function() {
      xray('http://www.pgatour.com/stats/stat.186.html', '#statsTable tbody tr', [{
        rank: 'td | trim | toNum',
        name: '.player-name a | removeSpace | trim'
      }])(function(err, rows) {
        _.each(rows, function (row) {
          if (row.rank < 300) {
            insertRanking(row.rank, row.name).then(function () { });
          }
        });
        res.status(201).json({"status": "Done"});
      });
    });
}

function deleteRankings(req, res, next) {
  db.none('delete from rankings')
    .then(function () {
      res.status(200).json({"status": "Done"});
    });
}
