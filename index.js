/**
 * This is the main file of the application. Run it with the
 * `node index.js` command from your terminal
 *
 * Remember to run `npm install` in the project folder, so 
 * all the required libraries are downloaded and installed.
 */ 

var url=require("url");
var sentiment = require('sentiment');
var twitter = require('ntwitter');

//initialize twitter credentials
var tweeter = new twitter({
    consumer_key: 'ZgR092AwXneuitiCcSqV4drqN',
    consumer_secret: 'ntFowvhqWOAwSWVIaDOm8luiaKDzfQjEgcNpg896rXWN3Dj4nT',
    access_token_key: '41069039-7csBcfHIi8yj8mjNvNHHOuSMpXNnsIjqiEbiCRvh9',
    access_token_secret: 'NwFfVY8s4aaTlnLxagFLpcQXlg5p4qaWhcdH9RnyBLxgl'
});


function sentimentImage(tweetCount, tweetTotalSentiment) {
    var avg = tweetTotalSentiment / tweetCount;
    if (avg > 0.5) { // happy
        return "img/happy.png";
    }
    if (avg < 0.3) { // angry
        return "img/angry.png";
    }
    else{
    	return "img/neutral.png";
    }
}


var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port= process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ipaddr= process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
// Configure express with the settings found in
// our config.js file

require('./config')(app);


server.listen(port,ipaddr);

//display index as root
app.get('/', function(req, res){

	res.render('index');

});


//respond to an search event after a new socket connection
io.on('connection', function (socket) {
socket.on('search', function (data) {
    var stream;
    var tweetCount=0;
    var  tweetTotalSentiment=0;
	
    //get search phrase
    var phrase = data.data;
	
     //login to twitter 
    tweeter.verifyCredentials(function (error, data) {
        	    stream = tweeter.stream('statuses/filter', { 'track': phrase }, function (stream) {
				tweeter.currentTwitStream = stream;
			   
			    socket.emit('ok', { message: "Monitoring Twitter" });
			    stream.on('data', function (data) {
										//filter only english tweets
										if (data.lang === 'en') {
											sentiment(data.text, function (err, result) {
											tweetCount++;
												
											tweetTotalSentiment += result.score;
											//send real time update of processing done
											if (tweetCount % 10 === 0) {
												socket.emit('ok', { message: "Analyzed "+tweetCount+" tweets"});  
												
											}
											//stop with 1000 tweets and publish results
											if(tweetCount % 1000 === 0 ) {  
												var icon=sentimentImage(tweetCount,tweetTotalSentiment);
												var result="Twitter is feeling.....";
												socket.emit('finished', { label: result, image: icon });
												tweeter.currentTwitStream.destroy();
											}
											
											});
										}
			    });
		});
	});

});

//destroy stream if user disconnected before publishing result
socket.on('disconnect', function(){
	if(tweeter.currentTwitStream){
		tweeter.currentTwitStream.destroy();     
	}
});


});