// =============================================================================
//  Peer object
// =============================================================================
var Peer = function() {
    this.id = null;
    this.last_processed_input = null;
  
    this.velocity = new THREE.Vector3();
    this.obj = new THREE.Object3D();
  
    this.jump = false;

};

Peer.prototype.applyInput = function(input){
    
    var dt = .01; // set to client physics refresh rate
    
    // Apply quaternion and rotation
    this.obj.quaternion.set(input.quat.x, input.quat.y, input.quat.z, input.quat.w);
    this.obj.rotation.set(input.rot.x,input.rot.y,input.rot.z);    
    
    if(input.jump){
        this.velocity.y += 350;
        this.jump = false;
    }
    
    this.velocity.x -= this.velocity.x * 10.0 * dt;
    this.velocity.z -= this.velocity.z * 10.0 * dt;
    this.velocity.y -= 9.8 * 100.0 * dt; // 100.0 = mass

    if ( input.key_up ) this.velocity.z -= 400.0 * dt;
    if ( input.key_down ) this.velocity.z += 400.0 * dt;
    if ( input.key_left ) this.velocity.x -= 400.0 * dt;
    if ( input.key_right ) this.velocity.x += 400.0 * dt;

    this.obj.translateX( this.velocity.x * dt );
    this.obj.translateY( this.velocity.y * dt );
    this.obj.translateZ( this.velocity.z * dt );

    if ( this.obj.position.y < 10 ) {
        this.velocity.y = 0;
        this.obj.position.y = 10;
    }
    
};


// =============================================================================
//  Message queue.
// =============================================================================
var Queue = function() {
  this.updates = [];
};

Queue.prototype.receive = function() {
  for (var i = 0; i < this.updates.length; i++) {
      var update = this.updates[i];
      this.updates.splice(i, 1);
      return update;
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
    
    this.processInputs();
    io.sockets.emit('server_state', server.buildPeersNetObject());
    
    //console.log(server.buildPeersNetObject());
    
};


// Check whether this input seems to be valid (e.g. "make sense" according
// to the physical rules of the World) simply return true for now
Server.prototype.validateInput = function(input) { 
    
    if(!this.peers[input.id]){
        return false;
    } else {
        return true;
    }
    
};

// Process all pending messages from peers.
Server.prototype.processInputs = function() {
  
    while (true) {
        
        var update = this.queue.receive();
    
        if (!update) { 
          break;
        }
    
        // Update the state of the peer, based on its input.
        if (this.validateInput(update)) {

            this.peers[update.id].applyInput(update);
            this.peers[update.id].last_processed_input = update.input_sequence_number;
      
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
        },
        quat:{
            x:this.peers[peer_id].obj.quaternion.x,
            y:this.peers[peer_id].obj.quaternion.y,
            z:this.peers[peer_id].obj.quaternion.z,
            w:this.peers[peer_id].obj.quaternion.w
        },
        rot:{
            x:this.peers[peer_id].obj.rotation.x,
            y:this.peers[peer_id].obj.rotation.y,
            z:this.peers[peer_id].obj.rotation.z
        },
        last_processed_input:this.peers[peer_id].last_processed_input
    };
    
};

// Build the object for the given peer id that is to be sent across the network
Server.prototype.buildPeersNetObject = function(){
    
    var netObj = new Object;
    
    for(var id in this.peers){
        //console.log(this.peers[id].obj);
        netObj[id] = {
            id:id,
            position:{
                x:this.peers[id].obj.position.x,
                y:this.peers[id].obj.position.y,
                z:this.peers[id].obj.position.z
            },
            quat:{
                x:this.peers[id].obj.quaternion.x,
                y:this.peers[id].obj.quaternion.y,
                z:this.peers[id].obj.quaternion.z,
                w:this.peers[id].obj.quaternion.w
            },
            rot:{
                x:this.peers[id].obj.rotation.x,
                y:this.peers[id].obj.rotation.y,
                z:this.peers[id].obj.rotation.z
            },
            last_processed_input:this.peers[id].last_processed_input
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
       //console.log(input);
       server.queue.updates.push(input);
   });
   
   
   
   
   socket.on('disconnect', function(){
       console.log('Client has disconnected');
       
       // Remove any queued inputs that are waiting to be processed
       for(var key in server.queue.updates){
           
       }
       
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