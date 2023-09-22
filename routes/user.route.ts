import express from 'express';
import { registrationUser , activateUser, loginUser, logoutUser, } from '../controllers/user.controller';
import { authorizeRoles, isAuthenticatedUser } from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', isAuthenticatedUser, authorizeRoles( 'admin', 'user'), logoutUser);



// userRouter.post('/login', login);

export default userRouter;