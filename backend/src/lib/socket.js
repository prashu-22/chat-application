import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import cron from "node-cron";

const app = express();
const server = http.createServer(app);
// Make io available globally

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});
global.io = io;
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

cron.schedule("* * * * *", async () => {
  const now = new Date();

  try {
    const dueMessages = await Message.find({
      scheduledFor: { $lte: now },
      status: "pending",
    });

    for (const msg of dueMessages) {
      msg.status = "sent";
      await msg.save();

      const receiverSocketId = getReceiverSocketId(msg.receiverId.toString());
      const senderSocketId = getReceiverSocketId(msg.senderId.toString());

      if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", msg);
      if (senderSocketId) io.to(senderSocketId).emit("updateMessageStatus", msg); // NEW
    }
  } catch (error) {
    console.error("Error processing scheduled messages:", error.message);
  }
});

export { io, app, server };
