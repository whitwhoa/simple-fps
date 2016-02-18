// =============================================================================
//  An Player in the world.
// =============================================================================
var Peer = function() {
  this.id = null;
  this.last_processed_input = null;
  
  this.velocity = new THREE.Vector3();
  this.obj = new THREE.Object3D();
  
  this.position_cache = [];

};


// =============================================================================
//  Message queue.
// =============================================================================
var Queue = function() {
  this.messages = [];
};

Queue.prototype.receive = function() {
  for (var i = 0; i < this.messages.length; i++) {
      var message = this.messages[i];
      this.messages.splice(i, 1);
      return message;
  }
};



var Server = function() {

  this.peers = new Object;
  this.queue = new Queue();
  
};

Server.prototype.connect = function(peer_id) {

    // Create a new peer for this connection.
    this.peers[peer_id] = new Peer();
    this.peers[peer_id].id = peer_id;
    // Set peer's initial position
    this.peers[peer_id].obj.position.x = -100;
    this.peers[peer_id].obj.position.y = 10;
    this.peers[peer_id].obj.position.z = 0;
  
};

Server.prototype.update = function() {
    //console.log(JSON.stringify(this.players));
  this.processInputs();
  io.sockets.emit('server_state', this.players);
};


// Check whether this input seems to be valid (e.g. "make sense" according
// to the physical rules of the World) simply return true for now
Server.prototype.validateInput = function(input) { 
  return true;
};

// Process all pending messages from clients.
Server.prototype.processInputs = function() {
  
  while (true) {
    var message = this.queue.receive();
    
    if (!message) { 
      break;
    }
    
    // Update the state of the player, based on its input.
    if (this.validateInput(message)) {
      this.players[message.id].press_time = message.press_time;
      this.players[message.id].applyInput(message);
      this.players[message.id].last_processed_input = message.input_sequence_number;
    }    
    
  }
};

// Build the object for the given peer id that is to be sent across the network
Server.prototype.buildPeerNetObject = function(peer_id){
    
    return {
        id:peer_id,
        position:{
            x:this.peers[peer_id].obj.position.x,
            y:this.peers[peer_id].obj.position.y,
            z:this.peers[peer_id].obj.position.z
        }
    };
    
};

// Build the object for the given peer id that is to be sent across the network
Server.prototype.buildPeersNetObject = function(){
    
    var netObj = new Object;
    
    for(var id in this.peers){
        netObj[id] = {
            id:id,
            position:{
                x:this.peers[id].obj.position.x,
                y:this.peers[id].obj.position.y,
                z:this.peers[id].obj.position.z
            }
        };
    }
    
    return netObj;
    
};



//DO STUFF AND SUCH
var server_fps = 10;
var server = new Server();

var node_server = require('http').Server();
var io = require('socket.io')(node_server);
var THREE = require('three');


io.on('connection', function(socket){
   console.log('New client has connected'); 
   
   // Create peer object for newly connected client
   server.connect(socket.id);
   
   var netPeer = server.buildPeerNetObject(socket.id);
   
   // Connect the peer to the server and return successful_connection event
   // containing the network object for this peer
   socket.emit('successful_connection', netPeer);
   
   // Send newly connected player object to all connected clients
   io.sockets.emit('new_player_connection', netPeer);
   
   // Send already connected players to newly connected player
   socket.emit('connected_players', server.buildPeersNetObject());
   
   
   
   socket.on('client_input', function(input){
       server.queue.messages.push(input);
   });
   
   
   
   
   socket.on('disconnect', function(){
       console.log('Client has disconnected');
       
       // Remove player from server
       delete(server.peers[socket.id]);
       
       io.sockets.emit('player_disconnect', socket.id);
       
   });
   
});

// Run server loop
var server_interval = setInterval(function(){
    server.update();
}, 1000 / server_fps);



node_server.listen(3000);