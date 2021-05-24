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

ser.pre(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  next();
})

ser.use(restify.plugins.bodyParser({ mapParams: true }));

function sendError(err, res) {
  console.log(err);
  res.send(500);
}

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getIdByToken(token) {
  try {
    var res = await pool.query('SELECT id FROM users WHERE token = $1', [token]);
    if (res.rowCount > 0) {
      return res.rows[0].id;
    }
  } catch (err) {
    console.log(err.stack);
  }
}

async function getDataFromDB(type, id) {
  var tables = ['areas', 'comments', 'districts', 'posts', 'users']
  try {
    type = tables.find(element => element == type);
    if (type) {
      if (id) {
        if (type == 'users') {
          return (await pool.query('SELECT id, name, img FROM users WHERE id = $1', [id])).rows;
        } else {
          return (await pool.query('SELECT * FROM ' + type + ' WHERE id = $1', [id])).rows;
        }
      } else {
        if (type == 'users') {
          return (await pool.query('SELECT id, name, img FROM users')).rows;
        } else {
          return (await pool.query('SELECT * FROM ' + type)).rows;
        }
      }
    }
  } catch (err) {
    console.log(err.stack);
  }
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
        pool.query('UPDATE users SET token = $1 WHERE phone = $2;', [token, req.params.phone], async (err, qres) => {
          if (err) {
            sendError(err, res);
          } else {
            var id = await getIdByToken(token);
            res.send({ id: id, token: token });
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
ser.post('/newpost', async function (req, res, next) {
  if (req.params.token && req.params.district_id && req.params.content) {
    var poster_id = await getIdByToken(req.params.token);
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
  next();
})

//new comment
ser.post('/newcomment', async function (req, res, next) {
  if (req.params.token && req.params.post_id && req.params.content) {
    var poster_id = await getIdByToken(req.params.token);
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
  next();
})

//update post
ser.put('/editpost', async function (req, res, next) {
  if (req.params.token && req.params.post_id && req.params.content) {
    var poster_id = await getIdByToken(req.params.token);
    if (poster_id) {
      //update post
      pool.query('UPDATE posts SET content = $1 WHERE poster_id = $2 AND id = $3;', [req.params.content, poster_id, req.params.post_id], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          res.send(200);
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
  next();
});

//update comment
ser.put('/editcomment', async function (req, res, next) {
  if (req.params.token && req.params.comment_id && req.params.content) {
    var poster_id = await getIdByToken(req.params.token);
    if (poster_id) {
      //update comment
      pool.query('UPDATE comments SET content = $1 WHERE poster_id = $2 AND id = $3;', [req.params.content, poster_id, req.params.comment_id], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          res.send(200);
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
  next();
});

//delete post
ser.del('/delpost', async function (req, res, next) {
  if (req.params.token && req.params.post_id) {
    var poster_id = await getIdByToken(req.params.token);
    if (poster_id) {
      //check if the poster is right
      pool.query('SELECT * FROM posts WHERE poster_id = $1 AND id = $2;', [poster_id, req.params.post_id], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          if (qres.rowCount > 0) {
            //delete all comments in the post
            pool.query('DELETE FROM comments WHERE post_id = $1;', [req.params.post_id], (err, qres) => {
              if (err) {
                sendError(err, res);
              } else {
                //delete the post
                pool.query('DELETE FROM posts WHERE id = $1;', [req.params.post_id], (err, qres) => {
                  if (err) {
                    sendError(err, res);
                  } else {
                    res.send(200);
                  }
                });
              }
            });
          } else {
            res.send(401);
          }
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
  next();
});

//delete comment
ser.del('/delcomment', async function (req, res, next) {
  if (req.params.token && req.params.comment_id) {
    var poster_id = await getIdByToken(req.params.token);
    if (poster_id) {
      //delete the comment
      pool.query('DELETE FROM comments WHERE poster_id = $1 AND id = $2;', [poster_id, req.params.comment_id], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          if (qres.rowCount > 0) {
            res.send(200);
          } else {
            res.send(401);
          }
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
  next();
});

//get data from database(all)
ser.get('/get/:table', async function (req, res, next) {
  if (req.params) {
    res.send(await getDataFromDB(req.params.table));
  } else {
    res.send(400);
  }
  next();
})

//get data from database
ser.get('/get/:table/:id', async function (req, res, next) {
  if (req.params) {
    if (req.params.id) {
      res.send(await getDataFromDB(req.params.table + 's', req.params.id));
    } else {
      res.send(await getDataFromDB(req.params.table + 's'));
    }
  } else {
    res.send(400);
  }
  next();
})

//get comment from a post
ser.get('/commentinpost/:post_id', function (req, res, next) {
  if (req.params.post_id) {
    //get comment
    pool.query('SELECT id, poster_id, timestamp, content FROM comments WHERE post_id = $1', [req.params.post_id], (err, qres) => {
      if (err) {
        sendError(err, res);
      } else {
        res.send(qres.rows);
      }
    });
  } else {
    res.send(400);
  }
  next();
})

//get all data from a user
ser.post('/userinfo', async function (req, res, next) {
  if (req.params.token && req.params.user_id) {
    var token_owner_id = await getIdByToken(req.params.token);
    if (token_owner_id == req.params.user_id) {
      //get the data
      pool.query('SELECT id, name, phone, pwd, img FROM users WHERE id = $1;', [req.params.user_id], (err, qres) => {
        if (err) {
          sendError(err, res);
        } else {
          res.send(qres.rows[0]);
        }
      });
    } else {
      res.send(401);
    }
  } else {
    res.send(400);
  }
  next();
})

ser.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', ser.name, ser.url);
});