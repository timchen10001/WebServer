import { Express } from "express";
import { send } from "process";
import { User } from "../entities/User";
import passport from "../services/passport";
import { req } from "../types";

export const authRoutes = (app: Express) => {
  // google
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );
  app.get(
    "/auth/google/callback",
    passport.authenticate("google"),
    (req: req, res) => {
      if (!req.user) {
        return;
      }
      const { id } = req.user as User;
      req.session.userId = id;
      // res.send(req.user);
      res.redirect(process.env.CORS_ORIGIN as string);
    }
  );

  // facebook
  app.get(
    "/auth/facebook",
    passport.authenticate("facebook", {
      failureRedirect: `${process.env.CORS_ORIGIN}/login`,
    })
  );
  app.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook"),
    (req: req, res) => {
      if (!req.user) {
        return;
      }
      const { id } = req.user as User;
      req.session.userId = id;
      res.redirect(process.env.CORS_ORIGIN as string);
    }
  );

  // twitter
  app.get(
    "/auth/twitter",
    passport.authenticate("twitter", {
      failureRedirect: `${process.env.CORS_ORIGIN}/login`,
    })
  );
  app.get(
    "/auth/twitter/callback",
    passport.authenticate("twitter"),
    (req: req, res) => {
      if (!req.user) {
        return;
      }
      const { id } = req.user as User;
      req.session.userId = id;
      res.redirect(process.env.CORS_ORIGIN as string);
    }
  );
};
