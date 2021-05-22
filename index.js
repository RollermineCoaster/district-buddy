var restify = require('restify');
var {Pool} = require('pg');
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var ser = restify.createServer();

ser.use(restify.plugins.bodyParser({mapParams: true}));

ser.post('/reg', function (req, res, next) {

  if(req.params.name&&req.params.phone&&req.params.pwd) {
    pool.query('INSERT INTO public.users(name, phone, pwd)	VALUES ($1, $2, $3);', [req.params.name, req.params.phone, req.params.pwd], (err, qres) => {
      if (err) {
        console.log(err);
        res.send(500);
      } else {
        res.send(201);
      }
    });
  }

  next();
});



ser.listen(process.env.PORT || 8080, function() {
  console.log('%s listening at %s', ser.name, ser.url);
});