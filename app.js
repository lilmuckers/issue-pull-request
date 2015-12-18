var express = require('express');
var app = module.exports = express.createServer();
var CONFIG = require('config');
var GitHub = require('githubber');
var cookieSecret = 'slkgfalsudifglaigudsfg';
var MemStore = express.session.MemoryStore;

var github = new GitHub.GitHub(CONFIG.GitHub.client_id, CONFIG.GitHub.secret, ['repo'], 'http://localhost:3000');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: cookieSecret, store: MemStore({
      reapInterval: 60000 * 10
    })}));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var GitHubMiddleware = GitHub.Express(github);

app.all('/*', GitHubMiddleware);

// Routes
app.all('/', function(req, res){
  req.GitHub.users.info(function(err, user){
    //add this user to the session for later use
    req.session.user = user;
    //now we get the repo list to list the forks.
    req.GitHub.repos.list(function(err, repos){
      var forks = [];
      for(var i in repos){
        if(repos[i].fork){
          forks.push(repos[i]);
        }
      }
      
      req.GitHub.orgs.list(null, function(err, orgs){
        
        getOrgRepos(req, orgs, forks, function(foundForks) {
          res.render('index', {
            title: 'Pull Request Converter',
            user: user,
            forks: foundForks
          }); 
        });
      });
    });
  });
});

function getOrgRepos(req, orgs, forks, callback)
{
  var o = orgs.pop().login;
  req.GitHub.repos.listOrg(o, function(err, repos) {
    for(var i in repos){
      if(repos[i].fork){
        forks.push(repos[i]);
      }
    }
    
    if(orgs.length == 0) {
      console.log(forks);
      callback(forks);
    } else {
      getOrgRepos(req, orgs, forks, callback)
    }
  });
}

app.post('/repo-select', function(req, res){
  //got the repo
  var repository = req.body.repo;
  
  //start the response
  var response = {
    head: {},
    base: {}
  }
  
  //first get the repo info
  req.GitHub.repos.info(repository, function(err, headRepo){
    //the repo data
    response.head.repo = headRepo;
    
    //then get the repo branches
    req.GitHub.repos.branches(headRepo, function(err, headBranches){
      response.head.branches = headBranches.reverse();
      //get the parent info
      req.GitHub.repos.info(headRepo.parent, function(err, baseRepo){
        response.base.repo = baseRepo;
        //then get the parent branches
        req.GitHub.repos.branches(baseRepo, function(err, baseBranches){
          response.base.branches = baseBranches;
          //get the parent issues that are assigned to me
          var filters = {
            assignee: req.session.user.login
          }
          req.GitHub.issues.list(baseRepo, filters, function(err, baseIssues){
            response.base.issues = baseIssues;
            res.json(response);
          });
        });
      });
    });
  });
});

app.post('/create-pull', function(req, res){
  //get the data
  var pull = req.body;
  
  //build the request
  var request = {
    issue: pull.issue,
    head : pull.user+':'+pull.head.branch,
    base : pull.base.branch
  }
  
  //run the request
  req.GitHub.pulls.create(pull.base.owner, pull.base.repo, request, function(err, data){
    res.json(data);
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
