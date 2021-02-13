import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import session from "express-session";
import Redis from "ioredis";
import connectRedis from "connect-redis";
import cors from "cors";

import keys from "./configs/keys";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { UserResolver } from "./resolvers/user";
import { PostResolver } from "./resolvers/post";
import { __prod__ } from "./constants";

const main = async () => {
  const con = await createConnection({
    ...keys.db,
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    session({
      name: keys.cookie.name,
      secret: keys.cookie.secret,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        sameSite: "lax", // csrf
        httpOnly: true,
        secure: __prod__,
      },
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.get("/", async (_, res) => {
    const user = await User.find();
    res.send(user);
  });

  app.listen(4000, () => {
    console.log("🌈 server started on localhost:4000 🌈");
  });
};

main().catch((e) => {
  console.log(e);
});
