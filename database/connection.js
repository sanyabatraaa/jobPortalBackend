import mongoose from 'mongoose';

export const connection = () =>{
    mongoose.connect(process.env.MONGO_URI,{
        dbName: "JOB_PORTAL_WITH_AUTOMATION"
    }).then(()=>{
        console.log("Connected to database")
    }).catch(err=>{
        console.log(`Some Error Occured While Connecting to Database : ${err}`)
    })
}