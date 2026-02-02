import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRouter.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'

const app = express()

// Connect DB
connectDB()
await connectCloudinary()

app.use(cors())

// 🔥 STRIPE WEBHOOK HARUS PALING ATAS & TANPA MIDDLEWARE LAIN
app.use(
    '/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhooks
  );

// Clerk webhook
app.post('/clerk', express.json(), clerkWebhooks)

// Middleware auth SETELAH webhook
app.use(clerkMiddleware())

// Normal API routes
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)

// Test route
app.get('/', (req, res) => res.send('API Working'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})