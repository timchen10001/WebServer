import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { User } from "../entities/User";
import { oauth2Mask } from "../utils/oauth2Mask";

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
          email,
          password,
          googleId,
          username,
          avator: profile._json.picture,
        }).save();
        done(undefined, user);
      }
    }
  )
);

export default passport;
