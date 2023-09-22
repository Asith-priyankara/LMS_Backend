import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
require("dotenv").config({ path: "./config/.env" });
import senDMail from "../utils/sendMail";
import { send } from "process";
import { sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
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
        res.cookie("access_Token", "", { maxAge: 1 });

        res.cookie("refresh_Token", "", { maxAge: 1 });
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