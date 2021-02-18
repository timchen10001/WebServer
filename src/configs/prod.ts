import { SessionOptions } from "express-session";
import { ConnectionOptions } from "typeorm";

export default {
  session: {
    name: process.env.COOKIE_NAME,
    secret: process.env.COOKIE_SECRET,
  } as SessionOptions,
  db: {
    type: process.env.DATABSE_TYPE,
    database: process.env.DATABSE_NAME,
    username: process.env.DATABSE_USERNAME,
    password: process.env.DATABSE_PASSWORD,
  } as ConnectionOptions,
};
