require("dotenv").config({path:"./config/.env"});
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";

export const app = express();

// body parser
app.use(express.json({limit: "50mb"}));

// cookie parser
app.use(cookieParser());


// cors => cross origin resource sharing
app.use(cors({
    origin: process.env.ORIGIN
}));


app.get("/test" , (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "Hello World"
    });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`Route ${req.originalUrl} not found`) as any;
    res.status(404);
    next(error);


});

app.use(ErrorMiddleware);