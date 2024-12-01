import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import bcrypt from 'bcrypt';

const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    bio:{
        type:String,
        required:true,
        maxLength:100
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    avatar:{
        public_id:{
            type:String,
            required:true
        },
        url:{
            type:String,
            required:true
        }
    }
},{
    timestamps:true
});


// before saving user the password will be hashed
userSchema.pre("save",async function(next){

    if(!this.isModified("password")) 
        return next()

    this.password = await bcrypt.hash(this.password,10)

    next()
})


export const User = models.User || model("User",userSchema);