import express from 'express'
import healthCheckRoutes from './routes/healthcheck.routes.js'

const app=express()

app.use('/api/v1/healthcheck',healthCheckRoutes)

export default app