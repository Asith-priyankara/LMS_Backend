import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { Secret, JwtPayload }  from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
require("dotenv").config({ path: "./config/.env" });
import senDMail from "../utils/sendMail";
import { send } from "process";
import { accessTokenOptions, sendToken, refreshTokenOptions } from "../utils/jwt";
import { redis } from "../utils/redis";
import { get } from "http";
import { getUserById } from "../services/user.service";
import cloudinary  from "cloudinary";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });

      if (isEmailExist) {
        return next(new ErrorHandler(400, "Email already exists"));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await senDMail({
          email: user.email,
          subject: "Account activation",
          template: "activation-mail.ejs",
          data,
        });
        res.status(200).json({
          success: true,
          message: `An email has been sent to ${user.email}. Please activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(400, error.message));
      }
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "10m" }
  );

  return { token, activationCode };
};

//activate user account

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler(400, "Incorrect activation code"));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler(400, "Email already exists"));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });

      res.status(201).json({
        success: true,
        message: "Account activated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

// login user
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler(400, "Please enter email and password"));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      };

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      };

      sendToken(user, 200, res);

    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);


// logout user
export const logoutUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
        res.cookie("accessToken", "", { maxAge: 1 });

        res.cookie("refreshToken", "", { maxAge: 1 });
        const userID = req.user._id || '';
        redis.del(userID);
    
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
        
        } catch (error: any) {
        return next(new ErrorHandler(400, error.message));
        }
    }
    
);


export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
        const refresh_Token = req.cookies.refreshToken as string;
        
        const decoded = jwt.verify(refresh_Token, process.env.REFRESH_TOKEN as string) as JwtPayload;

        if(!decoded){
            return next(new ErrorHandler(400, "refresh token is not valid"));
        }
        const session = await redis.get(decoded.id as string);

        if (!session) {
            return next(new ErrorHandler(400, "Could not referesh token"));
        }
        const user = JSON.parse(session);

        

       

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, { 
            expiresIn: "5m" });
         
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
            expiresIn: "300m",
        });
        
        req.user = user;

        res.cookie("accessToken", accessToken, accessTokenOptions)
        res.cookie("refreshToken", refreshToken, refreshTokenOptions);

        res.status(200).json({
            success: true,
            accessToken,
        });

    }

    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    }
});


//get user info
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
        const userId = req.user?._id;
        getUserById(userId, res);
    }
    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    } 

});

interface ISocialAuthBody {
    name: string;
    email: string;
    avatar: string;
}

//Social login
export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });

        if(!user){
            const newUser = await userModel.create({
                name,
                email,
                avatar,
            });
            sendToken(newUser, 200, res);
        }
        else{
            sendToken(user, 200, res);
        }


    }
    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    } 

});


// update user info
interface IUpdateUserInfo {
    name: string;
    email: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
        const {name,email} = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (email && user){
            const isEmailExist = await userModel.findOne({ email });
            if (isEmailExist) {
                return next(new ErrorHandler(400, "Email already exists"));
            }
            user.email = email;
        }

        if (name && user){
            user.name = name;
        }

        await user?.save();

        await redis.set(userId , JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        });


    }
    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    } 


});

// update user password
interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
}

export const updateUserPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
        const {oldPassword, newPassword} = req.body as IUpdateUserPassword;

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler(400, "Please enter old and new password"));
        }

        const user = await userModel.findById(req.user?._id).select("+password");

        if(user?.password === undefined){
            return next(new ErrorHandler(400, "User password is not defined"));
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword);

        if(!isPasswordMatch){
            return next(new ErrorHandler(400, "Old password is incorrect"));
        }

        user.password = newPassword;

        await user.save();
        
        await redis.set(req.user?._id, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user
        });


    }
    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    } 


});


// update profile picture

interface IUpdateProfilePicture {
    avatar: string;
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
        const {avatar} = req.body as IUpdateProfilePicture;
        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        if(avatar && user){
            // if user have one avatar then call this if
            if (user?.avatar?.public_id){

                // delete old avatar from cloudinary
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                    crop: "scale",
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }

            }
            else{
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                    crop: "scale",
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }

        }

        await user?.save();

        await redis.set(userId , JSON.stringify(user));

        res.status(200).json({
            success: true,
            user,
        });

    }

    catch(error: any){
        return next(new ErrorHandler(400, error.message));
    } 



});
