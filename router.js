var express = require('express');
var router = express.Router();
var User = require('../models/user');
var path = require("path");
var fs = require('fs');


// GET route for reading data
router.get('/', function (req, res, next) {
  return res.sendFile(path.join(__dirname + '/templateLogReg/index.html'));
});

function wrongUser(un){
  if (un === "jv" || un === "gr"){
    return false;
  }else{
    return true;
  }
}

//POST route for updating data
router.post('/', function (req, res, next) {
  // confirm that user typed same password twice
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error('Passwords do not match.');
    err.status = 400;
    res.send("passwords dont match");
    return next(err);
  }

  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf,
    }

    User.create(userData, function (error, user) {
      if (error) {
        return next(error);
      } else if (wrongUser(req.body.username)) {
        var err = new Error('Username not registered.');
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/corpus');
      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    User.authenticate(req.body.logemail, req.body.logpassword, function (error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/corpus');
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
})

// GET route after registering
router.get('/profile', function (req, res, next) {
 User.findById(req.session.userId)
    .exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          var err = new Error('Not authorized! Go back!');
          err.status = 400;
          return next(err);
        } else {
          return res.send('<h1>Name: </h1>' + user.username + '<h2>Mail: </h2>' + user.email + '<br><a type="button" href="/logout">Logout</a>')
        }
      }
    });
});

function isAuthenticated(req, res, next) {
  User.findById(req.session.userId)
    .exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          var err = new Error('Not authorized! Go back!');
          err.status = 400;
          return next(err);
        } else {
          return next()
        }
      }
    });
}

router.get('/corpus(/*+)?', isAuthenticated, function(req, res, next) {
    User.findById(req.session.userId)
    .exec(function (error, user) {
      var request = req.url.split("/corpus/");
      var caselaw = request[1];
      console.log("caselaw:", caselaw)
      if (caselaw === undefined) {
        res.sendFile(path.resolve(__dirname + '/../corpus/index.html'));
      } else {
        res.sendFile(path.resolve(__dirname + '/../corpus/cases/' + caselaw + ".html"));
      }

    });
});

// GET for logout logout
router.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

function saveResults(user, body){
  var stream = fs.createWriteStream("anno/" + user + "/" + body.casenumber + ".txt");
  stream.once('open', function () {
    var i;
    if (body.vehicle != undefined){
      for (i = 0; i < body.vehicle.length; i++) {
        stream.write(body.vehicle[i] + "\n");
      }
      stream.end();
    }
  });
}

router.post('/concurrence', function (req, res, next) {
  User.findById(req.session.userId)
  .exec(function (error, user){
    console.log("user: ", user.username);
    console.log("body: ", req.body);
    saveResults(user.username, req.body)
    return res.redirect('/corpus')
  });
});

module.exports = router;
