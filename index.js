// timeout in ms to simulate delay (debug)
TIMEOUT = 0

// web modules
var jsonParser  = require('body-parser').json();
var express     = require('express');
var app         = express();

// other modules
var RSVP  = require('rsvp');
var _     = require('underscore');
var elo   = require('./elo');

// serve static files
app.use(express.static('./public'));

// create db connection
var connection = require('./db');
connection.connect();
console.log("Established connection to database.");

// start listening
app.listen(8080);
console.log("Listening on 8080...");

// routes
app.get('/polls/:id(\\d+)?', function(req, res) {
  if (!req.params.id) {
    // get all polls
    var sql = 'SELECT * FROM polls';
    connection.query(sql, function(err, rows, fields) {
      if (err) throw err;

      // get alternatives count for each poll
      var promises = _.range(0,rows.length)
      .map(function(i) {
        return new RSVP.Promise(function(resolve, reject) {
          connection.query('SELECT count(id) AS count FROM alternatives WHERE polls_id=?',
          rows[i].id, function(err, rowsAlt, fields) {
            if (err) throw err;
            rows[i].alternativesCount = rowsAlt[0]["count"];
            resolve();
          });
        })
      });

      RSVP.all(promises).then(function() {
        setTimeout(function() {
          res.send(rows);
          res.end();
        }, TIMEOUT);
      });
    });
  } else {
    // get specific poll
    var sql = 'SELECT * FROM polls WHERE id=' + req.params.id;
    connection.query(sql, function(err, rows, fields) {
      if (err) throw err;

      connection.query('SELECT * FROM alternatives WHERE polls_id=?',
      rows[0].id, function(err, rowsAlt, fields) {
        if (err) throw err;
        rows[0].alternatives = rowsAlt;
        setTimeout(function() {
          res.send(rows);
          res.end();
        }, TIMEOUT);
      })
    })
  }
});

app.get('/polls/:id(\\d+)/challenge', function(req, res) {
  connection.query('SELECT id FROM alternatives WHERE polls_id=?' +
  ' ORDER BY ranked_times ASC LIMIT 5', req.params.id,
  function(err, rows, fields) {
    if (err) throw err;

    // shuffle alternatives for better user experience
    // (otherwise a lot of the time challenges will include
    // the same alternatives as previous challenges)
    // using random sort method - good enough for small arrays
    var random = rows.map(Math.random);
    rows.sort(function(a,b) {
      return random[rows.indexOf(a)] - random[rows.indexOf(b)];
    });

    // now pick two alternatives and sort them by id
    rows = rows.slice(0,2);
    rows.sort(function(a,b) { return +a.id - +b.id });

    // create challenge
    connection.query('INSERT INTO challenges(poll_id, alt1_id, alt2_id) ' +
    'VALUES (?, ?, ?)', [req.params.id, rows[0].id, rows[1].id],
    function(err, result, fields) {
      if (err) throw err;
      // send response containing alternative ids
      res.status(201).json({
        id: result.insertId, // newly created challenge id
        alt1: rows[0].id,
        alt2: rows[1].id
      });
      res.end();
    });

  });
});


app.post('/polls/challenge/:id(\\d+)', jsonParser, function(req, res) {
  connection.query('SELECT * FROM challenges WHERE id=?',
  req.body.id, function(err, rows, fields) {
    if (err) throw err;

    // get alternative
    connection.query('SELECT * FROM alternatives WHERE id=? or id=?' +
    ' ORDER BY id ASC', [rows[0].alt1_id, rows[0].alt2_id],
    function(err, rowsAlt, fields) {
      if (err) throw err;

      altProps = [{
        "id": rowsAlt[0].id,
        "score": rowsAlt[0].score,
        "ranked_times" :rowsAlt[0].ranked_times
      },{
        "id": rowsAlt[1].id,
        "score": rowsAlt[1].score,
        "ranked_times" :rowsAlt[1].ranked_times
      }];

      // update alternative's scores
      updateAlternatives(+req.body.result, altProps, function() {
        // delete challenge
        connection.query('DELETE FROM challenges WHERE id=?',
        req.body.id, function(err, rowsAlt, fields) {
          if (err) throw err;
          res.status(200).send("Results were successfully recorded!");
          res.end();
        });
      });
    });
  });
});

var updateAlternatives = function(result, altProps, callback) {
  var alt1Score = altProps[0].score;
  var alt2Score = altProps[1].score;
  var newScore  = elo.calcScore(result, alt1Score, alt2Score);

  var set = [{
    "id": altProps[0].id,
    "score": newScore[0],
    "ranked_times": ++altProps[0].ranked_times
  }, {
    "id": altProps[1].id,
    "score": newScore[1],
    "ranked_times": ++altProps[1].ranked_times
  }];

  var promises = [0,1].map(function(i) {
    return new RSVP.Promise(function(resolve, reject) {
      connection.query('UPDATE alternatives SET ? WHERE id=?',
      [set[i], set[i].id], function(err, rows, fields) {
        if (err) throw err;
        resolve();
      });
    })
  });

  RSVP.all(promises).then(function() {
    callback();
  });
}



// on ctrl-c
process.on('SIGINT', function() {
  connection.end();
  console.log("\nExiting...");
  process.exit();
});
