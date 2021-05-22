var restify = require('restify');
var {Pool} = require('pg');
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var ser = restify.createServer();

ser.post('/test', function (req, res, next) {
  pool.query('SELECT NOW()', (err, sqlres) => {
    if (err) {
      console.log(err);
      res.status(500);
    }
  });
  res.status(200);
  next();
});

ser.listen(process.env.PORT || 8080, function() {
  console.log('%s listening at %s', ser.name, ser.url);
});