import multer from 'multer';

const multerUpload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})


const singleAvatar = multerUpload.single("avatar")
const attachmentsMulter = multerUpload.array("files",5)

export {
    multerUpload,
    singleAvatar,
    attachmentsMulter
}