require("dotenv").config({ path: "./config/.env" });
import { Response } from "express";
import { IUser } from "../models/user.model";
import {redis} from "./redis";
interface ITokenOptions {
    expires : Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none' | undefined;
    secure: boolean;
}

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();

    //upload session to redis
    redis.set(user._id, JSON.stringify(user) as any);


    //parse environmnent variables to integrates with fallback values
    const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300' , 10);
    const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200' , 10);

    //set cookie options
    const accessTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + accessTokenExpire * 1000*60),
        maxAge: accessTokenExpire * 1000*60,
        httpOnly: true,
        sameSite: "lax",
        secure: false
    };

    const refreshTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + refreshTokenExpire * 1000*60),
        maxAge: refreshTokenExpire * 1000*60,
        httpOnly: true,
        sameSite: "lax",
        secure: false
    };


    // only set secure to true in production
    if(process.env.NODE_ENV === "production"){
        accessTokenOptions.secure = true;
        // refreshTokenOptions.secure = true;
    }

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    res.status(statusCode).json({
        success: true,
        user,
        accessToken,

    });



};