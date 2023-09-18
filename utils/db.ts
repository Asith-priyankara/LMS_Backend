import mongoose, { set } from "mongoose";    
require("dotenv").config({path:"./config/.env"});

const dbUrl = process.env.MONGO_URL as string;

const connectDB = async () => {
    try {
        await mongoose.connect(dbUrl).then((data:any) => {
            console.log(`MongoDB connected: ${data.connection.host}`);
        });

    } catch (error) {
        console.log("MongoDB connection failed");
        setTimeout(connectDB, 5000);
    }
}

export default connectDB;
