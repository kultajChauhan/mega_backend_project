import { asyncHandler } from "../utils/async-handler.js";
import { User } from "../models/user.models.js";
import { sendEmail, emailVerificationMailgenContent } from "../utils/mail.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

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
  sendEmail({ username: user.username, mailgenContent: emailContent });

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

  if(!user){
    return res.status(400).json({
      message:'user not found'
    })
  }

  user.isEmailVerified=true
  user.emailVerificationToken=undefined
  user.emailVerificationExpiry=undefined

  await user.save()

  return res.status(200).json({
    message:'Email verified'
  })

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
  const { email,password}=req.body

  if(!email||!password){
    return res.status(400).json({
      message:"Both field required"
    })
  }

  const user=await User.findOne({
    email
  })

  

});

const resetForgottenPassword = asyncHandler(async (req, res) => {});

const refreshAccessToken = asyncHandler(async (req, res) => {});

const forgotPasswordRequest = asyncHandler(async (req, res) => {});

const changeCurrentPassword = asyncHandler(async (req, res) => {});

const getCurrentUser = asyncHandler(async (req, res) => {});

export {
  registerUser,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetForgottenPassword,
  verifyEmail,
};
