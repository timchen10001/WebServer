import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { Reply } from "../entities/Reply";
import { User } from "../entities/User";
import { isAuth } from "../middlewares/isAuth";
import { MyContext } from "../types";
import { PostReplyInput, ReplyResponse } from "./graphql.types";

@Resolver(Reply)
export class ReplyResolver {
  @FieldResolver(() => User)
  replier(@Root() reply: Reply, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(reply.replierId);
  }

  @UseMiddleware(isAuth)
  @Mutation(() => ReplyResponse)
  async reply(
    @Arg("replyInput") replyInput: PostReplyInput,
    @Ctx() { req }: MyContext
  ): Promise<ReplyResponse> {
    const inValidContent = !replyInput.content;
    if (inValidContent) {
      return {
        errors: [
          {
            field: "content",
            message: "回覆內容不可空白",
          },
        ],
      };
    }

    const post = await Post.findOne(replyInput.postId);
    if (!post) {
      return {
        errors: [
          {
            field: "content",
            message: "貼文不存在",
          },
        ],
      };
    }

    const reply = Reply.create({
      postId: post.id,
      replierId: req.session.userId,
      content: replyInput.content,
    });

    try {
      await reply.save();
    } catch (err) {
      console.log(err);
      return {
        errors: [
          {
            field: err.code,
            message: err.message,
          },
        ],
      };
    }

    return { reply };
  }
}
