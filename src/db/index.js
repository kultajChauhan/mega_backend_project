import mongoose from "mongoose";

const connectDB = async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection failed", error);
    process.exit(1);
  }
};


export default connectDB