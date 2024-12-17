const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (roomName) => {
    socket.join(roomName);
    console.log(`${socket.id} joined room ${roomName}`);
  });

  socket.on('offer', (roomName, offer) => {
    socket.to(roomName).emit('offer', socket.id, offer);
  });

  socket.on('answer', (roomName, answer) => {
    socket.to(roomName).emit('answer', socket.id, answer);
  });

  socket.on('candidate', (roomName, candidate) => {
    socket.to(roomName).emit('candidate', socket.id, candidate);
  });

  socket.on('leave', (roomName) => {
    socket.leave(roomName);
    console.log(`${socket.id} left room ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


