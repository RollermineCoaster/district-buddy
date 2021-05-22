var restify = require('restify');
var {Pool} = require('pg');
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var ser = restify.createServer();

//test----------------------------------------
ser.get('/q', function (req, res, next) {
  res.send(pool.query('SELECT NOW()'));
  pool.end();
  next();
});
//--------------------------------------------

ser.listen(process.env.PORT || 8080, function() {
  console.log('%s listening at %s', ser.name, ser.url);
});