import dns from "node:dns/promises"
dns.setServers(["8.8.8.8","1.1.1.1"]);

import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRouter.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'
import keprajaanRouter from './routes/keprajaanRoutes.js'
import quizRouter from "./routes/quizRoutes.js";
import assignmentRouter from "./routes/assignmentRoutes.js";

const app = express()

// Connect DB
connectDB()
await connectCloudinary()

app.use(cors())

// app.post(
//     '/stripe',
//     express.raw({ type: 'application/json' }),
//     stripeWebhooks
//   );

// Clerk webhook
app.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhooks
);

// Middleware auth SETELAH webhook


// Normal API routes
app.use(clerkMiddleware())
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.use('/api/keprajaan', express.json(), keprajaanRouter)
app.use("/api/quiz",express.json(), quizRouter);
app.use(
  "/api/assignment",
  assignmentRouter,
);

// Test route
app.get('/', (req, res) => res.send('API Working'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})