require("dotenv").config({ path: "./config/.env" });
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
// import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";

const cookieParser = require("cookie-parser");

export const app = express();

// cookie parser
app.use(cookieParser());
// body parser
app.use(express.json({ limit: "50mb" }));



// cors => cross origin resource sharing
app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

//routes
app.use("/api/v1", userRouter);

// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Hello World",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`) as any;
  res.status(404);
  next(error);
});

app.use(ErrorMiddleware);
