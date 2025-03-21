const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (update for production)
  },
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Define a root route
app.get("/", (req, res) => {
  res.send("Welcome to the Anonymous Chat App Backend!");
});



// Define Conversation Schema
const conversationSchema = new mongoose.Schema({
  user1: String,
  user2: String,
  messages: [
    {
      sender: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  startTime: { type: Date, default: Date.now },
  endTime: Date,
});

const Conversation = mongoose.model("Conversation", conversationSchema);

// Generate random names
const generateRandomName = () => {
  return `User${Math.floor(Math.random() * 10000)}`;
};

// Store active users and their sockets
let users = [];
let waitingQueue = [];

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Assign a random name to the user
  const randomName = generateRandomName();
  socket.emit("assign-name", randomName);

  // Add user to the waiting queue
  socket.on("join", (interests) => {
    users.push({ id: socket.id, name: randomName, interests });
    waitingQueue.push(socket.id);

    // Match users
    if (waitingQueue.length >= 2) {
      const user1 = waitingQueue.shift();
      const user2 = waitingQueue.shift();

      // Notify both users
      io.to(user1).emit("match", users.find((u) => u.id === user2).name);
      io.to(user2).emit("match", users.find((u) => u.id === user1).name);

      // Create a conversation
      const conversation = new Conversation({
        user1: users.find((u) => u.id === user1).name,
        user2: users.find((u) => u.id === user2).name,
      });
      conversation.save();

      // Handle messages
      socket.on("message", (message) => {
        io.to(user1).to(user2).emit("message", {
          sender: randomName,
          message,
        });
        conversation.messages.push({ sender: randomName, message });
        conversation.save();
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        conversation.endTime = new Date();
        conversation.save();
        io.to(user1).to(user2).emit("end-chat");
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    users = users.filter((user) => user.id !== socket.id);
    waitingQueue = waitingQueue.filter((id) => id !== socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
