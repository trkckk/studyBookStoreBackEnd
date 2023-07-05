var port= 9001;

var employees = {};
var sockets = [];

var express = require('express');
var bodyParser = require('body-parser');
var mongoose= require('mongoose');   
var logger = require('morgan');

// express configuration
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));

app.use((req,res,next) => {
    res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "HEAD, GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-Width, Content-Type, Accept");	
	next();
});

mongoose.connect('mongodb://localhost:27017/store', {
    "useNewUrlParser": true,
    "socketTimeoutMS": 0,
    "keepAlive": true,
    "useUnifiedTopology" : true
});

var bookSchema = new mongoose.Schema({
  "_id": mongoose.Schema.Types.ObjectId,
  "title": {
	  type: String,
	  required: true
  },
  "isbn": {
	  type: String,
	  required: true
  },	  
  "cover": {
	  type: String,
	  required: false
  },	  
  "year": {
	  type: Number,
	  default: 2016,
	  min: 1920
  },
  "pages": {
	  type: Number,
	  default: 100,
	  min: 1
  },
  "price": {
	  type: Number,
	  required: true,
	  min: 0
  },
  "author": {
	  type: String,
	  required: true
  },
  "publisher":  {
	  type: String,
	  required: true
  }
});

var Book= mongoose.model('books', bookSchema);

app.get('/books',function(req,res){
  Book.find( {} , function(err,result){
    res.set('Content-Type','application/json');
    res.status(200).send(result);
  });
}) ;

app.get('/books/:isbn',function(req,res){
  Book.findOne( {"isbn": req.params.isbn} , function(err,result){
    res.set('Content-Type','application/json');
    res.status(200).send(result);
  });
}) ;

app.get('/publishers',function(req,res){
  Book.distinct( {"publisher": 1} , function(err,result){
    res.set('Content-Type','application/json');
    res.status(200).send(result);
  });
}) ;

// POST /books
app.post('/books',function(req,res){
	var book= req.body;
	book._id= mongoose.Types.ObjectId();
	var employee = new Book(book);	
	employee.save(function(err,book){
		res.set('Content-Type', 'application/json');	
		if (!err)
		   res.status(200).send(JSON.stringify(book));	     		
	    else
		   res.status(403).send(JSON.stringify({status: err}));	     		
	});
});

// PUT /books
app.put('/books',function(req,res){
	var book= req.body;
	var updatedFields = {};
	var updateAllowableFields = ["price", "year", 'pages', "title", "cover"];
	for (var i in updateAllowableFields){
		var field= updateAllowableFields[i];
		if (book.hasOwnProperty(field))  updatedFields[field]= book[field];
	}
	Book.findOneAndUpdate(
	   {"_id": book._id},
	   {$set: updatedFields},
	   {upsert : false}, 
	   function(err){
		res.set('Content-Type', 'application/json');	
		if (!err)
		   res.status(200).send(JSON.stringify(book));	     		
	    else
		   res.status(403).send(JSON.stringify({status: err}));	     		
	});
});

// DELETE /books/1
app.delete('/books/:id',function(req,res){
	var id= req.params.id;
	Book.findOneAndRemove({"_id": id},
		function(err,book){
			if (!err)
			   res.status(200).send(book);	     		
			else
			   res.status(403).send(JSON.stringify({status: err}));	    
		}
	);
});


app.post('/purchases',function(req,res){
	var purchase= req.body;
    sockets.forEach( socket => {
	    console.log(socket.id);
	    socket.emit('bam', purchase);
	});
    res.status(200).send({status : "Ok"});	     		
});

// socket.io configuration
var server = app.listen(port);
var io = require('socket.io').listen(server);
io.set("origins", "*:*");

io.on('connection', function (socket) {
    sockets.push(socket);
	console.log("Connection is open for socket "+socket.id);
	socket.on('disconnect', function () {
		var index= sockets.indexOf(socket);
		if (index>-1) sockets.splice(index,1);
	});	
});


console.log(
  "Server is running at port ".concat(port)
);