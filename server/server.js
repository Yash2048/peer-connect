import { Server } from 'socket.io';

const io = new Server(8080, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
});


io.on('connection', (socket) => {
  let users = 0;
  socket.on('join', (room, username) => {
    users++;
    console.group(`User #${users}`)
    console.log('New User Joined')
    console.log("Username: ",username )
    console.log("Room name: ",room )
    console.groupEnd(`User #${users}`)
    const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    socket.join(room);
    socket.emit('joined', { isInitiator: clientsInRoom === 0 })
  });
  
  
  // Relay offer, answer, ice-candidate to everyone else in the room
  socket.on('signal', ({ room, username, data }) => {
    console.log('User sent a signal')
    socket.to(room).emit('signal', username, data);
  });

  socket.on('disconnect', () => {
    users--;
    // socket.io auto-removes from rooms on disconnect
    console.log('User Disconnected')
  });
});

console.log('Signaling server running on ws://localhost:8080');
