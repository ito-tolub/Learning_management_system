import { clerkClient } from "@clerk/express";
import jwt from 'jsonwebtoken'

export const protectEducator = async (req, res, next) => {
    try{
        const userId = req.auth.userId
        const response = await clerkClient.users.getUser(userId)

        if(response.publicMetadata.role !== 'educator'){
            return res.json({success: false, message:'Unauthorized Access'})
        }

        next()

    } catch(error){
        res.json({success: false, message: error.message})
    }
}

export const protectDosen = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader.split(' ')[1]

        console.log('token:', token?.slice(0, 30))
        console.log('secret:', process.env.JWT_DOSEN_SECRET)

        // if (!authHeader?.startsWith('Bearer ')) {
        //     return res.json({ success: false, message: 'Token tidak ditemukan' })
        // }
        
        const decoded = jwt.decode(token)
        console.log('decoded (tanpa verify):', decoded)
        
        // Baru verify
        const verified = jwt.verify(token, process.env.JWT_DOSEN_SECRET)
        req.educator = verified
        next()
    } catch (error) {
        console.log('error name:', error.name)
        console.log('error message:', error.message)
        res.json({ success: false, message: 'Token tidak valid' })
    }
}