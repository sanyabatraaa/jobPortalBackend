import express from 'express';
import {getUser, login, logout, register, updatePassword, updateProfile} from "../controllers/userController.js";
import { isAuthenticated } from '../middlewares/auth.js';

const router= express.Router();

router.post('/register',register)
router.post('/login',login)
router.get("/logout",isAuthenticated,logout)
router.get('/getUser',isAuthenticated,getUser)
router.put('/profile/update',isAuthenticated,updateProfile)
router.put('/password/update',isAuthenticated,updatePassword)

export default router