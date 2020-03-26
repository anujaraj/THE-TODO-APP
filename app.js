// Importing and adding variables
var express = require('express');
var bodyParser = require('body-parser');
var sessions = require('express-session');
var session;
var app = express();
var mysql      = require('mysql');

const TWO_HOURS = 1000 * 60 * 60 * 2;

const {
	PORT = 3000,
	NODE_ENV = 'development',
	SESS_NAME = 'sid',
	SESS_LIFETIME = TWO_HOURS,
	SESS_SECRET = 'zen-o-sama'
} = process.env;

const IN_PROD = NODE_ENV === 'production';


// Adding middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(sessions({
    secret :SESS_SECRET,
    resave: false,
    saveUninitialized: true,
    name: SESS_NAME,
    cookie: {
        maxAge: SESS_LIFETIME,
        sameSite: true,
        secure: IN_PROD /* Strict */
    }
}));
app.use((req, resp, next) => {
    const { uniqueID } = req.session;
    if(uniqueID) {
        resp.locals.userUniqueID = uniqueID;
    }
    next();
});

// Connection
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'todo'
  });
  connection.connect(function(err){
  if(!err) {
      console.log("Database is connected");
  } else {
      console.log("Error while connecting with database");
  }
  });


// Redirecting guests to login if they try to access logged in links
const redirectToLogin = (req, resp, next) => {
	if (!req.session.uniqueID) {
		// If user is not logged in, DO THIS
		resp.redirect('/login');
	} else {
		// If user is logged in, DO THIS
		next();
	}
}; // Redirecting logged in users to homepage if they try to access login links
const redirectToHome = (req, resp, next) => {
	if (!!req.session.uniqueID) {
		// If user is logged in, DO THIS
		return resp.redirect('/todo');
	} else {
		// If user is not logged in, DO THIS
		next();
	}
};
  
// Routing
app.get('/', function(req,resp) {
    
    resp.sendFile('./views/main.html', {root: __dirname});
});
app.get('/login', function(req,resp) {
    session = req.session;
    if(session.uniqueID) {
       return resp.redirect('/redirects');
    }
    resp.sendFile('./views/index.html', {root: __dirname});
});

app.get('/signup', function(req,resp) {
    session = req.session;
    if(session.uniqueID) {
       return  resp.redirect('/redirects');
    }
    resp.sendFile('./views/index.html', {root: __dirname});
});

app.get('/todo', function(req,resp) {
     username = req.session.uniqueID;
    

    
    sql = 'SELECT * FROM todos WHERE username = ?';
    connection.query(sql, [username], function(err, row) {
       if (err) {
           console.log('err');
        
         } else {
            
             if(typeof row !== 'undefined' && row.length > 0){
                 req.session.uniqueID = row[0].username;
                 console.log(row);
                 return resp.sendFile('./views/todo.html', {root: __dirname});

                 }
                 else{
                  return resp.sendFile('./views/index.html', { root: __dirname });
                 }
             }
        
       })
   
      return resp.sendFile('./views/todo.html', {root: __dirname});
});

app.get('/my-list', function(req,resp) {
    username = req.session.uniqueID;
   sql = 'SELECT * FROM todos WHERE username = ?';
   connection.query(sql, [username], function(err, row) {
      if (err) {
          console.log('err');
          return resp.redirects('/redirects')
       
        } else {
           
            if(typeof row !== 'undefined' && row.length > 0){
                req.session.uniqueID = row[0].username;
                console.log(row);
            
                resp.send(JSON.stringify(row));
                
                }
                else{
                    return resp.send('You dont have a list..make one<a href="/todo">Make a task list</a>');
                //  return resp.sendFile('./views/todo.html', { root: __dirname });
                }
            }
       
      })
  
      return resp.sendFile('./views/todo.html', {root: __dirname});

});



app.get('/logout',redirectToLogin ,function(req, resp) {
    req.session.destroy( err => {
        if(err) {
            return resp.redirect('/todo');
        }

        resp.clearCookie(SESS_NAME);
        return resp.redirect('/login');
    } );
});


app.get('/redirects', function(req, resp) {
    session = req.session;
    if(session.uniqueID) {

     resp.end("You are logged in!!");
         
    } else{
   return resp.send('Who Are You? <a href="/signup">Sign up</a>')}
});

//post requests

app.post('/addtask', function(req,resp) {

    var todos={
        "todo":req.body.newtask,
        "username":req.session.uniqueID
        
    }
    connection.query('INSERT INTO todos SET ?',todos, function (error, results, fields) {
      if (error) {
        resp.json({
            status:false,
            message:'there are some error with query...Please login'
        })
      }else{
       
        connection.query("SELECT * FROM todos", function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            
          });
        }
      
   
    })
    resp.sendFile('./views/todo.html', {root: __dirname});
});


app.post('/removetask', function(req,resp) {
    var todos={
        "todo":req.body.removetask,
    
        
    }
    connection.query('DELETE FROM todos WHERE todo= ?', [req.body.removetask], function(err, result) {
        if (err) {
            throw err;
        }
      
    
      });
    resp.sendFile('./views/todo.html', {root: __dirname});
});

app.post('/login',function(req,resp) {
    username = req.body.username;
    password = req.body.password;
    sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    connection.query(sql, [username, password], function(err, row) {
        if (err) {
            console.log('error');
        } else {
            
            if(typeof row !== 'undefined' && row.length > 0){
                req.session.uniqueID = row[0].username;
            
                 return resp.redirect('/todo');
             

                }
                else{
                 return resp.sendFile('./views/index.html', { root: __dirname });
                }
            }
        
    });

});

app.post('/signup', function(req,resp) {
    
        name=req.body.name;
        username=req.body.username;
        password=req.body.password;
        

    sql = 'SELECT * FROM users WHERE username = ?';
	connection.query(sql, [username], function(err, row) {
		if (err) {
            // If there is an error in executing the statements
			console.log('error');
		} else {
			if (typeof row !== 'undefined' && row.length > 0) {
                // If username is already in database
                return resp.redirect('/login');
			} else {
                // If username is not there then we can add to database
                sqlQuery = 'INSERT INTO users (name, username, password) VALUES (?, ?, ?)'
                connection.query(sqlQuery, [name, username, password], (err, row) => {
                    if (err) {
                        // If there is any error in executing the statements
                        console.log('error');
                        return resp.redirect('/login');
                    } else { // If registering is successful.
                        req.session.uniqueID = username;
                        //return resp.redirect('/todo');
                    }
                } );
			}
		}
	});
    
});


app.listen(3000, function() {
    console.log("Listening at port 3000");
    console.log("Server started at http://127.0.0.1:3000");
});
