import { Request, Response } from "express";
import session from "express-session";
import { Redis } from "ioredis";
import { createFriendLoader } from "./utils/createFriendLoader";
import { createReplyLoader } from "./utils/createReplyLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";

export type req = Request & {
  session?: session.Session & { userId?: number };
};

export type MyContext = {
  req: req;
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createUpdootLoader>;
  replyLoader: ReturnType<typeof createReplyLoader>;
  friendLoader: ReturnType<typeof createFriendLoader>;
};
