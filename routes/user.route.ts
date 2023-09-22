import express from 'express';
import { registrationUser , activateUser, loginUser, logoutUser, updateAccessToken, getUserInfo, socialAuth, updateUserInfo, updateUserPassword, updateProfilePicture, } from '../controllers/user.controller';
import { authorizeRoles, isAuthenticatedUser } from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', isAuthenticatedUser, authorizeRoles( 'admin', 'user'), logoutUser);

userRouter.get('/refresh', updateAccessToken);

userRouter.get('/me', isAuthenticatedUser, getUserInfo);

userRouter.post('/social-auth', socialAuth);

userRouter.put('/update-user-info', isAuthenticatedUser, updateUserInfo);

userRouter.put('/update-user-password', isAuthenticatedUser, updateUserPassword);

userRouter.put('/update-user-avatar', isAuthenticatedUser, updateProfilePicture);



// userRouter.post('/login', login);

export default userRouter;