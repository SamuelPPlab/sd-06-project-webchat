require('dotenv').config();

const express = require('express');

const app = express();
const http = require('http').createServer(app);

const cors = require('cors');
const nunjucks = require('nunjucks');

const io = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const { uuid } = require('uuidv4');

const { createMessage } = require('./utils/createMessage');

app.use(express.static(`${__dirname}/public`));

nunjucks.configure(`${__dirname}/views`, {
  express: app,
  noCache: true,
});

const appRoutes = require('./routes');

app.use(cors());

app.use(appRoutes);

let connectedUsers = [];

function fil(users, user) {
  return users.filter((connected) => user.nickname !== connected.nickname);
}

io.on('connection', (socket) => {
  const user = { nickname: '', id: uuid() };

  socket.on('newUser', (nickname) => {
    user.nickname = nickname;

    socket.emit('users', [user, ...connectedUsers]);
    connectedUsers.push(user);

    socket.broadcast.emit('newUser', user);
  });

  socket.on('newNickname', (newNickname) => {
    user.nickname = newNickname;

    connectedUsers = connectedUsers.map((connected) =>
      ({ ...connected, nickname: connected.id !== user.id ? connected.nickname : newNickname }));

    socket.broadcast.emit('newNickname', user);
  });

  socket.on('disconnect', () => { connectedUsers = fil(connectedUsers, user); });

  socket.on('message', async ({ chatMessage }) => {
    const formattedMessage = await createMessage({ chatMessage, nickname: user.nickname });

    io.emit('message', formattedMessage);
  });
});

http.listen(3000, () => {
  console.log('Servidor ouvindo na porta 3000');
});
