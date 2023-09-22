import { Request, Response, NextFunction } from 'express';
import  ErrorHandler  from '../utils/ErrorHandler';
import { CatchAsyncError } from './catchAsyncErrors';
import jwt , {JwtPayload} from 'jsonwebtoken';
import { redis} from '../utils/redis';
require('dotenv').config({path: './config/.env'});
import { IUser } from '../models/user.model';

//authenticated user
export const isAuthenticatedUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.accessToken ;
   
     if (!access_token) {
        return next(new ErrorHandler(400, "Login first to access this resource"));

    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

    if(!decoded){
        return next(new ErrorHandler(400, "access token is not valid"));

    }

    const user = await redis.get(decoded.id);

    if (!user) {
        return next(new ErrorHandler(400, "User does not exist"));

    }

   req.user = JSON.parse(user);

   next();

});


//validate user roles
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if (!roles.includes(req.user.role || '')) {
            return next(new ErrorHandler(403, `Role (${req.user.role}) is not allowed to access this resource`));
        }
        next();
    }
}