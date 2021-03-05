import argon2 from "argon2";
import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { v4 as uuidv4 } from "uuid";
import { User } from "../entities/User";
import { oauth2Mask } from "../utils/oauth2Mask";
import cloudinary from "./cloudinary";

passport.serializeUser((user, done) => {
  // console.log(user);
  done(undefined, user);
});

// passport.deserializeUser((user, done) => {
//   done(undefined, user)
// })

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_OAUTH2_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log({
      //   accessToken,
      //   refreshToken,
      //   profile,
      // });

      const googleId = profile.id;
      const username = oauth2Mask(profile.displayName, "google");
      const email = oauth2Mask(profile._json.email, "google");
      let user = await User.findOne({ where: { googleId } });
      if (user) {
        // 檢查使用者是否 已更改 Google 中的 姓名、信箱、頭像
        const usernameHasChange = user.username !== username;
        const emailHasChange = user.email !== email;
        const avatorHasChange = user.avator !== profile._json.picture;

        switch (true) {
          case usernameHasChange:
            user.username = username;
          case emailHasChange:
            user.email = email;
          case avatorHasChange:
            user.avator = profile._json.picture;
          case usernameHasChange || emailHasChange || avatorHasChange:
            await user.save();
        }
        done(undefined, user);
      } else {
        const randomPass = uuidv4();
        const password = await argon2.hash(randomPass);
        user = await User.create({
          googleId,
          email,
          password,
          username,
          avator: profile._json.picture,
        }).save();
        done(undefined, user);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_OAUTH2_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_OAUTH2_CLIENT_SECRET as string,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "picture", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log({ accessToken, refreshToken, profile });

      const avatorUploadResponse = await cloudinary.uploader.upload(
        profile._json.picture.data.url,
        {
          public_id: `${profile.id}`,
          allowed_formats: ["jpeg", "jpg", "png", "webp"],
          folder: "/avator/facebook",
          overwrite: true,
          type: "upload",
        },
        (error, result) => {
          console.log(result, error);
        }
      );

      // console.log(avatorUploadResponse);

      const facebookId = profile.id;
      const username = oauth2Mask(profile.displayName, "facebook");
      const email = oauth2Mask(profile._json.email, "facebook");
      let user = await User.findOne({ where: { facebookId } });
      if (user) {
        const usernameHasChange = username !== user.username;
        const emailHasChange = email !== user.email;

        switch (true) {
          case usernameHasChange:
            user.username = username;
          case emailHasChange:
            user.email = email;
        }
        user.avator = avatorUploadResponse.secure_url;
        await user.save();
        done(undefined, user);
      } else {
        const randomPass = uuidv4();
        const password = await argon2.hash(randomPass);
        user = await User.create({
          facebookId,
          username,
          password,
          email,
          avator: avatorUploadResponse.secure_url,
        }).save();
        done(undefined, user);
      }
    }
  )
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_OAUTH2_CONSUMER_KEY as string,
      consumerSecret: process.env.TWITTER_OAUTH2_CONSUMER_SECRET as string,
      includeEmail: true,
      callbackURL: "/auth/twitter/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log({
      //   accessToken,
      //   refreshToken,
      //   profile,
      // });

      const twitterId = profile.id;
      const username = oauth2Mask(profile.displayName, "twitter");
      const email = oauth2Mask(profile._json.email, "twitter");
      const avator = profile._json.profile_image_url_https;

      let user = await User.findOne({ where: { twitterId } });
      if (user) {
        const usernameHasChange = user.username !== username;
        const emailHasChange = user.email !== email;
        const avatorHasChange = user.avator !== avator;

        switch (true) {
          case usernameHasChange:
            user.username = username;
          case emailHasChange:
            user.email = email;
          case avatorHasChange:
            user.avator = avator;
          case usernameHasChange || emailHasChange || avatorHasChange:
            await user.save();
        }
        done(undefined, user);
      } else {
        const randomPass = uuidv4();
        const password = await argon2.hash(randomPass);
        user = await User.create({
          twitterId,
          username,
          email,
          password,
          avator,
        }).save();
        done(undefined, user);
      }
    }
  )
);


export default passport;
