const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.static('public')); // Предполагается, что ваши HTML файлы находятся в папке public

io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('broadcaster', (roomID) => {
        socket.join(roomID);
        socket.to(roomID).emit('watcher', socket.id);
    });

    socket.on('watcher', (roomID) => {
        socket.join(roomID);
    });

    socket.on('offer', ({ offer, roomID, id }) => {
        socket.to(id).emit('offer', { offer, id });
    });

    socket.on('answer', ({ answer, roomID, id }) => {
        socket.to(id).emit('answer', answer);
    });

    socket.on('iceCandidate', ({ candidate, roomID }) => {
        socket.to(roomID).emit('iceCandidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});