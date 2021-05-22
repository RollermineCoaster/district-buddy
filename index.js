var restify = require('restify');
var {Client} = require('pg');
var client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function query(str, val) {
  client.connect();

  client.query(str, val, (err, res) => {
    if (err) {
      res.send(err.stack);
    } else {
      res.send(res);
    }
  })

  client.end();
}

var ser = restify.createServer();

//test----------------------------------------
ser.get('/q/:str/:val', function (req, res, next) {
  query(req.params.str, req.params.val);
  next();
});
//--------------------------------------------

ser.listen(process.env.PORT || 8080, function() {
  console.log('%s listening at %s', ser.name, ser.url);
});