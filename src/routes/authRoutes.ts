import { Express } from "express";
import { User } from "../entities/User";
import passport from "../services/passport";
import { req } from "../types";

export const authRoutes = (app: Express) => {
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
      res.redirect(process.env.CORS_ORIGIN);
    }
  );
};
