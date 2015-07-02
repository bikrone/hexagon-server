var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = 1234;

var rooms = [];
var players = [];
var playerRoom = [];

var quitGame = function(username, roomid) {
	try {
		rooms[roomid].players.forEach(function(player) {
			if (player !== username) {
				try {
					players[player].emit('otherQuit', username);
				}
				catch (ex) {
					return;
				}
			}
		});
		rooms[roomid] = undefined;
	}
	catch (ex) {
		console.log(ex);
		return;
	}

	console.log("User '" + username +"' has just quit room " + roomid);
}

var register = function(username, socket) {
	if (players[username] != undefined) {
		return -1;
	}
	players[username] = socket;
	socket.username = username;
	
	console.log(username +" has just registered");

	return 1;
}

var unregister = function(username) {
	try {
		players[username] = undefined;

	} catch (ex) {
		console.log(ex);
	}
}

var joinRoom = function(username, roomid) {
	if (rooms[roomid] === undefined) {
		rooms[roomid] = {};
		rooms[roomid].id = roomid;
		rooms[roomid].players = [];		
	}
	if (rooms[roomid].players.length == 2) {
		return 0;
	}

	var count = 2;

	if (rooms[roomid].players.length == 1) {
		count = 1;
		try {			
			rooms[roomid].players.forEach(function(player) {				
				try {
					players[player].emit('otherJoin', username)
				} catch (ex) {
					console.log(ex);
				}
			});
		} catch (ex) {
			console.log(ex);
		}
	}

	rooms[roomid].players.push(username);
	playerRoom[username] = roomid;

	console.log(username +" has just joined room " + roomid + " play Player " + (2-count+1));
	console.log(rooms[roomid].players);

	return count;
}

var sendDataToRoom = function(a, message, data) {
	if (playerRoom[a] === undefined || rooms[playerRoom[a]] === undefined) return;	
	rooms[playerRoom[a]].players.forEach(function(player) {		
		if (player != a) {
			console.log(player);
			players[player].emit(message, data);
		}
	});
	console.log(a + " sent " + message + " with data " + data);
}

io.on('connection', function(socket) {
	console.log('A user connected to the server');

	socket.on('disconnect', function() {
		if (socket.username !== undefined) {
			console.log(socket.username + " has unregistered");
			quitGame(socket.username, playerRoom[socket.username]);
			unregister(socket.username);			

		}		
	});

	socket.on('unregister', function(data) {
		if (socket.username !== undefined) {
			console.log(socket.username + " has unregistered");
			quitGame(socket.username, playerRoom[socket.username]);
			unregister(socket.username);
		}
	});

	socket.on('register', function(data) {
		d = data.split('|');
		var username = d[0];
		var roomid= d[1];
		var result = register(username, socket);
		if (result == -1) {
			socket.emit('registerResult', -1);
			return;
		}
		result = joinRoom(username, roomid); 		
		socket.emit('registerResult', result);
	});

	socket.on('sendMove', function(data) {
		sendDataToRoom(socket.username, 'sendMove', data);
	});
});

http.listen(port, function() {
	console.log('Server ready at port ' + port);	
});