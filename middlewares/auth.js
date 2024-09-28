import { User } from "../models/userSchema.js"
import { catchAsyncErrors } from "./catchAsyncErrors.js"
import Errorhandler from "./error.js"
import jwt from "jsonwebtoken"

export const isAuthenticated = catchAsyncErrors ( async (req,res,next)=>{
    const {token} = req.cookies
    if(!token){
        return next(new Errorhandler("User is not authenticated",400))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

    req.user = await User.findById(decoded.id)

    next();
})

export const isAuthorized = (...roles)=>{
    return ( req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return next(new Errorhandler("User is not authorized",400))
        }
        next();
    }
}