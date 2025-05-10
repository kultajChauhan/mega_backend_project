import { Router } from "express";
import { userRegisterValidater } from "../validators";
import { validate } from "../middlewares/validator.middleware";
import { registerUser } from "../controllers/auth.controllers";

const router=Router()

router.route('/register').post(userRegisterValidater(),validate,registerUser)

export default router