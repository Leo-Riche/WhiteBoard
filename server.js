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
