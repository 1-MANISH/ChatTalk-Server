import { envMode } from "../app.js";

const errorMiddleware = (err,req,res,next) => {


    err.message = err.message || "Internal Server Error"
    err.statusCode = err.statusCode || 500

    // may its JsonWebTokenError or mongoose or multer error

    // Handle invalid JWT error
    if(err.name === "JsonWebTokenError"){
        err.statusCode = 401;
        err.message = "Invalid Token. Please log in again"
    }
    if(err.name === "TokenExpiredError"){
        err.statusCode = 401
        err.message = "Token has expired log in again"
    }

    // Handle mongoose validation error
    if(err.name === "ValidationError"){
        err.statusCode = 400
        err.message = Object.values(err.errors).map((error) => error.message).join(",")
    }
    // Mongoose duplicate key error
    if(err.code === 11000){
        err.statusCode = 400
        err.message =  `Duplicate ${Object.keys(err.keyValue)} entered`
    }
    // Handle mongoose cast error
    if(err.name === "CastError"){
        err.statusCode = 400
        err.message = `Invalid ${err.path}: ${err.value}.`;
    }

    // multer file limit error
    if(err.code === "LIMIT_UNEXPECTED_FILE"){
        err.statusCode = 400
        err.message = "File size limit exceeded"
    }

    return res.status(err.statusCode).json({
        success:false,
        message: err.message ,
       ...(envMode === "DEVELOPMENT" && {error:err})
    })
    
}

const TryCatch = (passedFunction) => async (req,res,next) => {
 try {
    await passedFunction(req,res,next)
 } catch (error) {
    next(error)
 }
}


export {
    errorMiddleware,
    TryCatch
}