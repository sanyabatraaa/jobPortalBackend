import {catchAsyncErrors} from "../middlewares/catchAsyncErrors.js"
import Errorhandler from "../middlewares/error.js"
import {User} from "../models/userSchema.js"
import {v2 as cloudinary} from "cloudinary"
import { sendToken } from "../utils/jwtToken.js"

export const register = catchAsyncErrors(async (req,res,next)=>{
    try {
        const {
            name,
            email,
            phone,
            address,
            password,
            role,
            firstNiche,
            secondNiche,
            thirdNiche,
            coverLetter
        }= req.body

        if(!name || !email || !phone || !address || !password || !role){
            return next(new Errorhandler("All Fields are required!",400))
        }

        if(role === "Job Seeker" && (!firstNiche || !secondNiche || !thirdNiche)){
            return next(new Errorhandler("Please provide your preferred job niches",400))
        }

        const existingUser = await User.findOne({email})

        if(existingUser){
            return next(new Errorhandler("User Already Exists",400))
        }

        const userData = {
            name,
            email,
            phone,
            address,
            password,
            role,
            niches:{
                firstNiche,
                secondNiche,    
                thirdNiche
            },
            coverLetter
        };

        if(req.files && req.files.resume){
            const {resume} = req.files;
            if(resume){
                try {
                    const cloudinaryResponse = await cloudinary.uploader.upload(
                        resume.tempFilePath,
                        {folder:"Job_Seekers_Resume"}
                    );

                    if(!cloudinaryResponse || cloudinaryResponse.error){
                        return next(new Errorhandler("Failed to uplaoad resume to the cloud",400))
                    }

                    userData.resume={
                        public_id : cloudinaryResponse.public_id,
                        url: cloudinaryResponse.secure_url,
                    }
                } catch (error) {
                    return next(new Errorhandler("Failed to uplaoad resume",500))
                }
            }
        }
        const user = await User.create(userData)
     
        sendToken(user,201,res,"User Registered!")
    } catch (error) {
        next(error)
    }
})

export const login= catchAsyncErrors(async (req,res,next)=>{
    try {
        const {email,password,role} = req.body

        if(!email || !password || !role) {
            return next(new Errorhandler("Please Enter All the Details",400))
        }

        const user = await User.findOne({email}).select("+password")
        if(!user){
            return next(new Errorhandler("Invalid Email or Password",400))
        }

        const isPasswordMatched = await user.comparePassword(password)

        if(!isPasswordMatched){
            return next(new Errorhandler("Invalid Email or Password",400))
        }

        if(user.role!== role){
            return next(new Errorhandler("Invalid User Role",400))
        }

        sendToken(user,201,res,"User LoggedIn Successfully")
    } catch (error) {
        
    }
})

export const logout = catchAsyncErrors(async ( req,res,next)=>{
    res.status(200).cookie("token","",{
        expires: new Date(Date.now()),
        httpOnly: true
    }).json({
        success: true,
        message:"Logged out successfully"
    })
})

export const getUser = catchAsyncErrors(async (req,res,next)=>{
    const user = req.user
    res.status(200).json({
        success: true,
        user
    })
})

export const updateProfile = catchAsyncErrors(async(req,res,next)=>{
    const newUserData = {
        name:req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        coverLetter: req.body.coverLetter,
        niches:{
            firstNiche: req.body.firstNiche,
            secondNiche: req.body.secondNiche,
            thirdNiche: req.body.thirdNiche
        }
    }

    const {firstNiche, secondNiche, thirdNiche} = newUserData.niches;

    if(req.user.role === "Job Seeker" && (!firstNiche || !secondNiche || !thirdNiche)){
        return next(new Errorhandler("Please provide your prefferrd job niches"))
    }

    if(req.files){
        const {resume} = req.files;
        if(resume){
            const currResumeId = req.user.resume.public_id
            if(currResumeId){
                await cloudinary.uploader.destroy(currResumeId)
            }
            const newResume = await cloudinary.uploader.upload(resume.tempFilePath,{
                folder:"Job_Seekers_Resume"
            })
            newUserData.resume ={
                public_id: newResume.public_id,
                url:newResume.secure_url
            }
        }
    }
    const user = await User.findByIdAndUpdate(req.user.id,newUserData,{
        new:true,
        runValidators:true,
        useFindAndModify: false
    })

    res.status(200).json({
        success:true,
        user,
        message: "Profile Updated"
    })
})

export const updatePassword = catchAsyncErrors(async (req,res,next)=>{
    const user = await User.findById(req.user.id).select("+password")

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword)

    if(!isPasswordMatched){
        return next(new Errorhandler("Old Password is incorrect",400))
    }

    if(req.body.newPassword !== req.body.confirmPassword){
        return next(new Errorhandler("Passwords donot match"))
    }

    user.password= req.body.newPassword;
    await user.save()
    sendToken(user,200,res,"Password updated successfully")
})