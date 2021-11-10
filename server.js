// Faça seu código aqui
const moment = require('moment');
const express = require('express');

const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const { createMessage, getAllMessages } = require('./models/messageModel');

const port = 3000;

const date = () => moment().format('DD-MM-YYYY hh:mm:ss A');
let sockets = [];

const nicknameUpdater = (oldNickname, newNickname) => {
  sockets.forEach((item, i) => {
    const { userId } = item;
    if (item.nickname === oldNickname) {
      sockets[i] = { userId, nickname: newNickname };
    }
  });
};

const saveMessageOnDB = async (message, nickname, timestamp) => {
  await createMessage({ message, nickname, timestamp });
};

const messageCreator = (data) => {
  const { nickname, chatMessage } = data;
  const timestamp = date();
  const message = `${timestamp} - ${nickname}: ${chatMessage}`;
  saveMessageOnDB(chatMessage, nickname, timestamp);
  io.emit('message', message);
};

io.on('connection', (socket) => {
  socket.on('message', (data) => {
    messageCreator(data);
  });
  socket.on('newNickname', ({ newNickname, oldNickname }) => {
    nicknameUpdater(oldNickname, newNickname);
    io.emit('newUserList', sockets);
  });
  socket.on('createNickname', (nickname) => {
    sockets.push({ nickname, userId: socket.id });
    io.emit('newUserList', sockets);
  });
  socket.on('disconnect', () => {
    sockets = sockets.filter((item) => item.userId !== socket.id);
    io.emit('newUserList', sockets);
  });
});

app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/', async (_req, res) => {
  const allMessages = await getAllMessages();
  res.render('home', { allMessages });
});

httpServer.listen(port);
