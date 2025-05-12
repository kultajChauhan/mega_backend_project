import express from 'express'
import healthCheckRoutes from './routes/healthcheck.routes.js'

const app=express()

app.use('/api/v1/healthcheck',healthCheckRoutes)
app.use('/api/v1/auth',authRoutes)

export default app