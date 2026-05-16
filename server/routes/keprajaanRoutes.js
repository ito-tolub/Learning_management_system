import express from 'express'
import { syncKeprajaan, checkKeprajaan } from '../controllers/keprajaanController.js'

const keprajaanRouter = express.Router()

// User sync data via NPP
keprajaanRouter.post('/sync', syncKeprajaan)

// Cek status keprajaan user
keprajaanRouter.get('/check', checkKeprajaan)

export default keprajaanRouter
