import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config();
export const connectDB = async ()=>{
    try{
        console.log("MONGO_URI:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected Successfully");
    }catch(error){
        console.log("Error connecting to MongoDB ",error);
        process.exit(1) // 1 means exit with failure
    }
}
