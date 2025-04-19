// server.js

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

let waitingUsers = []; // Queue of sockets waiting to be matched
let rooms = {}; // roomId: [socket1, socket2]

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Add user to queue
  waitingUsers.push(socket);

  // Try to match
  if (waitingUsers.length >= 2) {
    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();

    const roomId = `room-${user1.id}-${user2.id}`;
    rooms[roomId] = [user1, user2];

    user1.join(roomId);
    user2.join(roomId);

    user1.emit('match-found', { roomId, peerId: user2.id });
    user2.emit('match-found', { roomId, peerId: user1.id });

    console.log(`Matched: ${user1.id} & ${user2.id} in ${roomId}`);
  }

  // Relay WebRTC signaling messages
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    waitingUsers = waitingUsers.filter((s) => s.id !== socket.id);

    for (const [roomId, users] of Object.entries(rooms)) {
      if (users.find((s) => s.id === socket.id)) {
        const other = users.find((s) => s.id !== socket.id);
        if (other) {
          other.leave(roomId);
          other.emit('partner-disconnected');
        }
        delete rooms[roomId];
        break;
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send('Chitchat backend matchmaking running!');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
