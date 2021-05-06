import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import "dotenv-safe/config";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import passport from "passport";
import path from "path";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Friend } from "./entities/Friend";
import { Post } from "./entities/Post";
import { Reply } from "./entities/Reply";
import { Updoot } from "./entities/Updoot";
import { User } from "./entities/User";
import { FriendResolver } from "./resolvers/friend";
import { PostResolver } from "./resolvers/post";
import { ReplyResolver } from "./resolvers/reply";
import { UserResolver } from "./resolvers/user";
import { authRoutes } from "./routes/authRoutes";
import restfull from "./routes/restfull";
import { createFriendLoader } from "./utils/createFriendLoader";
import { createReplyLoader } from "./utils/createReplyLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";

const main = async () => {
  const con = await createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Updoot, Friend, Reply],
  });

  // await con.runMigrations();

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      secret: process.env.SESSION_SECRET,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        sameSite: "lax", // csrf
        httpOnly: true,
        secure: __prod__,
        domain: __prod__ ? process.env.DOMAIN : undefined,
      },
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());

  authRoutes(app);
  restfull(app);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, ReplyResolver, UserResolver, FriendResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
      replyLoader: createReplyLoader(),
      friendLoader: createFriendLoader(),
    }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  const PORT = parseInt(process.env.PORT);
  app.listen(PORT, () => {
    console.log(`🌈 server listen on port:${PORT} 🌈`);
  });

};

main().catch((e) => {
  console.log(e);
});
