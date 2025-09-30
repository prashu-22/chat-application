import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
     scheduledFor: {
    type: Date, // If null → send immediately
    default: null,
  },
   status: {
    type: String,
    enum: ["pending", "sent"],
    default: "sent",
  },  
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
