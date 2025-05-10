import app from "./app.js";
import dotnet from "dotenv";
import connectDB from "./db/index.js";

dotnet.config({
  path: "./.env",
});

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error", error);
    process.exit(1);
  });
