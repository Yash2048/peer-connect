import { Server } from 'socket.io';

const io = new Server(8080, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
});


io.on('connection', (socket) => {
  socket.on('join', (room) => {
    const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    socket.join(room);
    socket.emit('joined', { isInitiator: clientsInRoom === 0 })
  });


  // Relay offer, answer, ice-candidate to everyone else in the room
  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    // socket.io auto-removes from rooms on disconnect
  });
});

console.log('Signaling server running on ws://localhost:8080');
