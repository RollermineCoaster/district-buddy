var restify = require('restify');
var crypto = require('crypto');

var { Pool } = require('pg');
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var ser = restify.createServer();

ser.use(restify.plugins.bodyParser({ mapParams: true }));

function sendError(err, res) {
  console.log(err);
  res.send(500);
}

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getIdByToken(token) {
  return pool.query('SELECT id FROM users WHERE token = $1', [token])
    .then(qres => {
      return qres.rows[0];
    })
    .catch(err => console.log(err.stack));
}

//user registration
ser.post('/reg', function (req, res, next) {

  if (req.params.name && req.params.phone && req.params.pwd) {
    //check if exist
    pool.query('SELECT * FROM users WHERE phone = $1', [req.params.phone], (err, qres) => {
      if (err) {
        sendError(err, res);
      } else if (qres.rowCount > 0) {
        res.send(409);
      } else {
        //create user
        pool.query('INSERT INTO users(name, phone, pwd)	VALUES ($1, $2, $3);', [req.params.name, req.params.phone, req.params.pwd], (err, qres) => {
          if (err) {
            sendError(err, res);
          } else {
            res.send(201);
          }
        });
      }
    });
  } else {
    res.send(400);
  }

  next();
});

//user login
ser.post('/login', function (req, res, next) {
  if (req.params.phone && req.params.pwd) {
    //check if user valid
    pool.query('SELECT * FROM users WHERE phone = $1 AND pwd = $2;', [req.params.phone, req.params.pwd], (err, qres) => {
      if (err) {
        sendError(err, res);
      } else if (qres.rowCount < 1) {
        res.send(404);
      } else {
        var token = genToken();
        //save token to database
        pool.query('UPDATE users SET token = $1 WHERE phone = $2;', [token, req.params.phone], (err, qres) => {
          if (err) {
            sendError(err, res);
          } else {
            res.send({ token: token });
          }
        })
      }
    })
  } else {
    res.send(400);
  }
  next();
})

//new post
ser.post('/newpost', function (req, res, next) {
  if (req.params.token && req.params.district_id && req.params.content) {
    var poster_id = getIdByToken(req.params.token);
    console.log(poster_id);
    if (poster_id) {
      //create post
      pool.query('INSERT INTO posts(poster_id, district_id, content)	VALUES ($1, $2, $3);', [poster_id, req.params.district_id, req.params.content], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          res.send(201);
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
})

//new comment
ser.post('/newcomment', function (req, res, next) {
  if (req.params.token && req.params.post_id && req.params.content) {
    var poster_id = getIdByToken(req.params.token);
    if (poster_id) {
      //create comment
      pool.query('INSERT INTO comments(poster_id, post_id, content)	VALUES ($1, $2, $3);', [poster_id, req.params.post_id, req.params.content], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          res.send(201);
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
})

ser.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', ser.name, ser.url);
});