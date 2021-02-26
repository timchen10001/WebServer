import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";

export const isLogin: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (context.req.session.userId) {
    throw new Error("使用者已登入");
  }
  return next();
};
