import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { InputPost } from "./graphql.types";
import { MyContext } from "../types";
import { isAuth } from "../middlewares/isAuth";

@Resolver()
export class PostResolver {
  // find all posts
  @UseMiddleware(isAuth)
  @Query(() => [Post], { nullable: true })
  async posts(@Ctx() { req }: MyContext): Promise<Post[] | null> {
    return await Post.find({ where: { creatorId: req.session.userId } });
  }

  // create a post based on the session-userId
  @UseMiddleware(isAuth)
  @Mutation(() => Post)
  async createPost(
    @Arg("input") input: InputPost,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return await Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  // updata a post
  @UseMiddleware(isAuth)
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("input") input: InputPost,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const post = await Post.findOne({
      where: { id, creatorId: req.session.userId },
    });
    if (!post) {
      return null;
    }

    const { title, text } = input;
    // 更新貼文內容)
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title, text });
    }
    return post;
  }

  // delete a post
  @UseMiddleware(isAuth)
  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const post = await Post.find({
      where: { id, creatorId: req.session.userId },
    });
    if (!post) {
      return false;
    }
    await Post.delete(id);
    return true;
  }
}
