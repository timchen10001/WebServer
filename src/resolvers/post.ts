import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { InputPost } from "./graphql.types";
import { MyContext } from "../types";
import { isAuth } from "../middlewares/isAuth";
import { getConnection } from "typeorm";

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  // find all posts
  @UseMiddleware(isAuth)
  @Query(() => [Post])
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<Post[]> {
    const realNumber = Math.min(50, limit);
    const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder('p')
      .where(`p."creatorId" = ${req.session.userId}`)
      .orderBy('p."createdAt"', "DESC")
      .take(realNumber);

    if (cursor) {
      qb.where('p."createdAt" > :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }
    const posts = await qb.getMany();
    return posts;
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
    const post = await Post.findOne({
      where: { id, creatorId: req.session.userId },
    });
    if (!post) {
      return false;
    }
    await Post.delete(id);
    return true;
  }
}
