import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';

const io = new Server(8080, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
});

const generateRoomName = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(10), b => chars[b % chars.length]).join('');
}


io.on('connection', (socket) => {
  socket.on('join', (room) => {
    if (room == "") {
      room = generateRoomName();
    }

    console.log('User joined room: ', room)
    const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    socket.join(room);
    socket.emit('joined', room, { isInitiator: clientsInRoom === 0 })
  });

  socket.on('leave', (room) => {
    socket.leave(room);
    console.log('User left room: ', room)
  })

  // Relay offer, answer, ice-candidate to everyone else in the room
  socket.on('signal', ({ room, username, data }) => {
    console.log('User sent a signal')
    socket.to(room).emit('signal', username, data);
  });

  socket.on('disconnect', () => {
    // socket.io auto-removes from rooms on disconnect
    console.log('User Disconnected')
  });
});

console.log('Signaling server running on ws://localhost:8080');
