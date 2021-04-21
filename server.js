const express = require('express');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const app = express();
app.use(express.static(`${__dirname}/public/`));

const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const model = require('./models/Messages');
const { createTimestamp } = require('./utils/TimeStamp');
const formatMessage = require('./utils/FormatChatMessage');

app.set('view engine', 'ejs');
app.set('views', './views');

let users = [];

// Altera o nome do usuario conectado
const changeNicknameFunction = ({ newNickname, socket }) => {
  users.map((user) => {
    if (user.id === socket.id) Object.assign(user, { id: user.id, nickname: newNickname });

    return user;
  });
  io.emit('updateOnlineUsers', users);
};

// Atualiza usuarios quando disconectado
const disconnectFunction = (socket) => {
  const onlineUsers = users.filter((user) => user.id !== socket.id);
  
  users = onlineUsers;
  
  io.emit('updateOnlineUsers', users);
};

// Socket Connection
io.on('connection', async (socket) => {  
  socket.on('sendNickname', ({ nickname }) => {
    users.push({ id: socket.id, nickname });
    io.emit('updateOnlineUsers', users);
  });

  socket.on('message', async ({ nickname, chatMessage }) => {
    const timestamp = createTimestamp();
  
    await model.save({ nickname, chatMessage, timestamp });
    io.emit('message', formatMessage({ nickname, chatMessage, timestamp }));
  });

  socket.on('changeNickname', (newNickname) => changeNicknameFunction({ newNickname, socket }));
  socket.on('disconnect', () => disconnectFunction(socket));
});

app.get('/', async (_req, res) => {
  const prevMessages = await model.getAll();
  const messagesToRender = prevMessages.map((message) => formatMessage(message));

  return res.render('home', { messagesToRender });
});

httpServer.listen(PORT, () => console.log(`App Webchat listening on port ${PORT}!`));
