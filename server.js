const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const drawingHistory = [];

io.on('connection', (socket) => {
  console.log('🟢 Un utilisateur est connecté');

  socket.emit('initCanvas', drawingHistory);

  socket.on('draw', (data) => {
    drawingHistory.push({ type: 'draw', data });
    socket.broadcast.emit('draw', data);
  });

  socket.on('draw_line', (data) => {
    drawingHistory.push({ type: 'draw_line', data });
    socket.broadcast.emit('draw_line', data);
  });

  socket.on('clear', () => {
    drawingHistory.length = 0;
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('🔴 Un utilisateur est déconnecté');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
});
