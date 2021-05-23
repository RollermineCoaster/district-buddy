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
        pool.query('INSERT INTO public.users(name, phone, pwd)	VALUES ($1, $2, $3);', [req.params.name, req.params.phone, req.params.pwd], (err, qres) => {
          if (err) {
            console.log(err);
            res.send(500);
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



ser.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', ser.name, ser.url);
});