// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('🟢 Un utilisateur est connecté');

  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  socket.on('clear', () => {
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('🔴 Un utilisateur est déconnecté');
  });
});

http.listen(3000, () => {
  console.log('Serveur lancé sur http://localhost:3000');
});
