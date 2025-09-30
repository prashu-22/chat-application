import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const currentTime = new Date();

    const messages = await Message.find({
      $or: [
        // Messages sent by me
        { senderId: myId, receiverId: userToChatId },
        // Messages sent to me by the other user, but only if scheduled time has arrived
        {
          senderId: userToChatId,
          receiverId: myId,
          $or: [
            { scheduledFor: { $lte: currentTime } },
            { status: "sent" },
            { scheduledFor: { $exists: false } },
          ],
        },
      ],
    }).sort({ createdAt: 1 }); // optional: sort by time ascending

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image, scheduledFor } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      status: scheduledFor ? "pending" : "sent",
    });

    await newMessage.save();

    // Only emit immediately if it's not scheduled
    console.log(scheduledFor,"scheduledFor")
    if (!scheduledFor) {
      console.log("Emitting immediately");
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

