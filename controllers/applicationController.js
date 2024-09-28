import {catchAsyncErrors} from '../middlewares/catchAsyncErrors.js'
import Errorhandler from '../middlewares/error.js'
import {Application} from '../models/ApplicationSchema.js'
import {Job} from '../models/JobSchema.js'
import {v2 as cloudinary} from 'cloudinary'

export const postApplication = catchAsyncErrors(async ( req, res , next)=>{
    const {id} = req.params;
    const {name,email,phone,address,coverLetter} = req.body;
    if(!name || !email || !phone || !address || !coverLetter){
        return next(new Errorhandler("Pleae Enter All the Details",400))
    }
    const jobSeekerInfo = {
        id: req.user._id,
        name,
        email,
        phone,
        address,
        coverLetter,
        role:"Job Seeker"
    }
    const jobDetails = await Job.findById(id);
    if(!jobDetails){
        return next(new Errorhandler("Job Not Found",404))
    }

    const isAlreadyApplied = await Application.findOne({
        "jobInfo.jobId": id,
        "jobSeekerInfo.id": req.user._id
    })

    if(isAlreadyApplied){
        return next(new Errorhandler("You have already applied for this job",400))
    }

    if(req.files && req.files.resume){
        const {resume} = req.files;
        try {
            const cloudinaryResponse = await cloudinary.uploader.upload(resume.tempFilePath,{
                folder:"Job_Seekers_Resume"
            });

            if(!cloudinaryResponse || cloudinaryResponse.error){
                return next(new Errorhandler("Failed to upload resume to cloudinary",500))
            }

            jobSeekerInfo.resume = {
                public_id: cloudinaryResponse.public_id,
                url:cloudinaryResponse.secure_url
            }
        } catch (error) {
            return next(new Errorhandler("Failed to upload resume",500))
        }
    }else{
        if(req.user && !req.user.resume.url){
            return next(new Errorhandler("Please upload your resume",400))
        }

        jobSeekerInfo.resume = {
            public_id: req.user && req.user.resume.public_id,
            url: req.user && req.user.resume.url
        }
    }

    const employerInfo = {
        id: jobDetails.postedBy,
        role: "Employer"
    }

    const jobInfo = {
        jobId : id,
        jobTitle: jobDetails.title
    }

    const applications= await Application.create({
        jobSeekerInfo,
        employerInfo,
        jobInfo
    })
    res.status(201).json({
        success: true,
        applications
    })
})

export const employerGetAllApplication = catchAsyncErrors(async ( req,res,next)=>{
    const {_id} = req.user;
    const applications= await Application.findOne({
        "employerInfo.id":_id,
        "deletedBy.employer" : false
    })
    res.status(200).json({
        success: true,
        applications
    })
})

export const jobSeekerGetAllApplication = catchAsyncErrors(async ( req,res,next)=>{
    const {_id} = req.user;
    const applications= await Application.findOne({
        "jobSeekerInfo.id":_id,
        "deletedBy.jobSeeker" : false
    })
    res.status(200).json({
        success: true,
        applications
    })
})

export const deleteApplication = catchAsyncErrors(async ( req,res,next)=>{
    const { id} = req.params;
    const application = await Application.findById(id)
    if(!application){
        return next(new Errorhandler("Application not found",400))
    }
    const { role } = req.user 

    switch(role){
        case "Job Seeker":
            application.deletedBy.jobSeeker = true;
            await application.save()
            break;
        case "Employer":
            application.deletedBy.employer = true;
            await application.save()
            break;
        default : 
            console.log("default case for application delete function")
            break;       
    }
    if(application.deletedBy.jobSeeker=== true && application.deletedBy.employer === true){
        await application.deleteOne();
    }
    res.status(200).json({
        success: true,
        message: "Application Deleted"
    })

})