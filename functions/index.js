const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Chitchat backend matchmaking running!");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or your frontend URL
    methods: ["GET", "POST"]
  }
});

const userQueue = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Store user in queue
  userQueue[socket.id] = socket;

  // Match with another user
  const otherUserId = Object.keys(userQueue).find(id => id !== socket.id);

  if (otherUserId) {
    socket.emit("match", { userId: otherUserId });
    userQueue[otherUserId].emit("match", { userId: socket.id });

    delete userQueue[otherUserId];
    delete userQueue[socket.id];
  }

  socket.on("disconnect", () => {
    console.log("User disconnected");
    delete userQueue[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
