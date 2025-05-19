import { asyncHandler } from "../utils/async-handler.js";
import { User } from "../models/user.models.js";
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from "../utils/mail.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({
      message: "All Field Required",
    });
  }

  const user = await User.create({ username, email, password });

  await user.save;

  //send verify email
  const { hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  console.log("token: ", hashedToken);
  await user.save();

  const verificationUrl = `${process.env.BASE_URL}/verifyToken/${token}`;
  console.log("verificationUrl: ", verificationUrl);

  const emailContent = emailVerificationMailgenContent(
    user.username,
    verificationUrl,
  );
  sendEmail({
    username: user.username,
    subject: "user registered",
    mailgenContent: emailContent,
  });

  res.status(200).json({
    message: "User Registered!",
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    $and: [
      { emailVerificationToken: token },
      { emailVerificationExpiry: { $gt: Date.now() } },
    ],
  });

  if (!user) {
    return res.status(400).json({
      message: "user not found",
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save();

  return res.status(200).json({
    message: "Email verified",
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "All Field Required",
    });
  }

  const user = await User.findOne(email);

  if (!user) {
    return res.status(400).status({
      message: "Email or Password may wrong",
    });
  }

  const isPasswordMatch = await user.isPasswordCorrect(user.password);
  if (!isPasswordMatch) {
    throw new ApiError(400, "Invalid user credentials !");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(400, "email is not verified");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save();

  const userData = await User.find(user._id).select(
    "-password,-isEmailVerified,-forgotPasswordToken,-forgotPasswordExpiry,-refreshToken,-emailVerificationToken,-emailVerificationExpiry",
  );

  const cookieOption = {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60 * 24,
  };

  return res
    .status(400)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(new ApiResponse(200, userData, "user login successfull"));
});

const logoutUser = asyncHandler(async (req, res) => {
  const { id } = req.user._id;
  const user = await User.findById(id).updateOne({ refreshToken: "" });

  return res
    .status(200)
    .cookie("accessToken", "")
    .cookie("refreshToken", "")
    .json({
      message: "Logout successfull !",
    });
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Both field required",
    });
  }

  const user = await User.findOne({
    email,
  });

  const url = user.generateTemporaryToken();

  const emailVerificationContent = emailVerificationMailgenContent();

  sendEmail({
    username: user.username,
    subject: "resend email verification",
    mailgenContent: emailVerificationContent,
  });

  return res.status(400).json({
    message: "email verification send again",
  });
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  const user = await User.findOne(email);

  const token = user.generateForgotPasswardToken();

  await user.save();

  const url = `${process.env.BASE_URL}/api/v1/auth/forgotPassword/${token}`;

  const forgotPasswordContent = forgotPasswordMailgenContent(
    user.username,
    url,
  );

  sendEmail({
    username: user.username,
    subject: "forgot password link!",
    mailgenContent: forgotPasswordContent,
  });

  return res.status(400).json({
    message: "forgot password link send",
  });
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { token } = req.params;

  if (!password === confirmPassword) {
    return res.status(400).json({
      message: "both password not matched",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    $and: [
      { forgotPasswordToken: hashedToken },
      { forgotPasswordExpiry: { $gt: Date.now() } },
    ],
  });

  if (!user) {
    new ApiError(404, "password time expired or invalid token");
  }

  user.password = password;
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  await user.save();

  return res.status(200).json({
    message: "password reset successfully",
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshtoken } = res.cookie;

  if (!refreshtoken) {
    throw new ApiError(400, "refresh token missing unauthorise");
  }

  let decode;

  try {
    decode = jwt.verify(refreshtoken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "invalid or expired refresh token");
  }

  const user = await User.findOne(decode._id);
  if (!user) {
    throw new ApiError(400, "user is not found");
  }

  if (user.refreshToken !== refreshtoken) {
    throw new ApiError(
      400,
      "Refresh token does not match. Possible token reuse Detected",
    );
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save();

  const cookieOption = {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60 * 24,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        200,
        "token refreshed successfully. Please use the new token",
      ),
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {currentPassword,newPassword,confirmNewPassword}=req.body

  if(!currentPassword||!newPassword||!confirmNewPassword){
    throw new ApiError(400,'all field required')
  }

  const user=await User.findOne(currentPassword)

  if(!user){
    throw new ApiError(400,'user not found')
  }

   user.password=currentPassword
   await user.save()

   return res.status(200).json(
    new ApiResponse(200,'password change successfully')
   )
});

const getCurrentUser = asyncHandler(async (req, res) => {
const {email}=req.body

if(!email){
  throw new ApiError(400,'email is required')
}

const user=await User.findOne(email)

if(!user){
  throw new ApiError(400,'user not found')
}

const userData = await User.find(user._id).select(
    "-password,-isEmailVerified,-forgotPasswordToken,-forgotPasswordExpiry,-refreshToken,-emailVerificationToken,-emailVerificationExpiry",
  );

  return res.status(200).json(
    userData
  )
});

export {
  registerUser,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  changeCurrentPassword,
  resendEmailVerification,
  resetForgottenPassword,
  verifyEmail,
};
