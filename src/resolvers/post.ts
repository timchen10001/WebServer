import { sleep } from "../utils/sleep";
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
import { getConnection } from "typeorm";
import { Post } from "../entities/Post";
import { Updoot } from "../entities/Updoot";
import { isAuth } from "../middlewares/isAuth";
import { MyContext } from "../types";
import { InputPost, PaginatedPosts } from "./graphql.types";
import { User } from "../entities/User";

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  // Query Posts (根據條件)
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    // 如果是分頁請求，放慢回應速度
    if (cursor !== null) {
      await sleep(1000);
    }

    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const { userId } = req.session;

    const replacements: any[] = [realLimitPlusOne, userId ? userId : null];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    // SQL 從資料庫中取出資料
    const posts = await getConnection().query(
      `
      select p.*,
      ${
        userId
          ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
          : '$2 as "voteStatus"'
      }
      from post p
      ${cursor ? `where p."createdAt" < $3` : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length > realLimit,
    };
  }

  // 新增貼文 (create post)
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  createPost(
    @Arg("input") input: InputPost,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  // 更新貼文 (update post)
  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
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
    const isValidPost =
      typeof title !== "undefined" && typeof text !== "undefined";
    // 更新貼文內容)
    if (isValidPost) {
      post.title = title;
      post.text = text;
      post.updatedAt = new Date();
      await post.save();
    }
    return post;
  }

  // 刪除貼文 (delete post)
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const post = await Post.findOne({
      where: { id, creatorId: req.session.userId },
    });
    if (!post) {
      return false;
    }
    await sleep(4000);
    await Updoot.delete({ postId: id });
    await Post.delete({ id });
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    // 確認 value 是否非 -1 即可，不需使用實際 value
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;

    // 更新投票系統
    const updoot = await Updoot.findOne({ where: { postId, userId } });
    let result: boolean = true;
    try {
      await getConnection().transaction(async (tm) => {
        if (!updoot) {
          // 對該 Po文 沒投票過的 user

          // 1. 新增對應 Updoot 實例
          await tm.query(
            `
            insert into updoot ("userId", "postId", value)
            values ($1, $2, $3)
          `,
            [userId, postId, realValue]
          );
          // 2. 更新 post.points
          await tm.query(
            `
          update post
          set points = points + $1
          where id = $2
          `,
            [realValue, postId]
          );
        } else if (updoot) {
          // 投過票了(updoot 實例存在)，但想更新結果

          if (updoot.value !== realValue) {
            // 1. 如果改變投票選項 (up -> down) || (down -> up)
            //  1.i 更新 updoot.value
            await tm.query(
              `
              update updoot
              set value = $1
              where "postId" = $2 and "userId" = $3
              `,
              [realValue, postId, userId]
            );
            //  1.ii 更新 post.points
            await tm.query(
              `
              update post
              set points = points + $1
              where id = $2
              `,
              [2 * realValue, postId]
            );
          } else if (updoot.value === realValue) {
            // 2. 如果投相同的票 (up -> up || down -> down)
            // 需回到初始狀態

            // 2.i 刪除對應的 updoot 實例
            await tm.query(
              `
              delete from updoot
              where "postId" = $1 and "userId" = $2
            `,
              [postId, userId]
            );
            // 2.ii 將該 Po文的 points 還原
            await tm.query(
              `
              update post
              set points = points - $1
              where id = $2
            `,
              [realValue, postId]
            );
          }
        }
      });
    } catch (e) {
      console.log(e);
      result = false;
    }
    return result;
  }
}
