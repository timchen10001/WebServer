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

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 50);
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return await Post.findOne(id, { relations: ["creator"] });
    // relations -> left join creator
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

  // find all posts
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(200, limit);
    const realLimitPlusOne = realLimit + 1;
    const { userId } = req.session;

    const replacements: any[] = [realLimitPlusOne, userId ? userId : null];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
      select p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email
      ) creator,
      ${
        userId
          ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
          : '$2 as "voteStatus"'
      }
      from post p
      inner join public.user u on u.id = p."creatorId"
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

  // create a post based on the session-userId
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
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
  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
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
    await Updoot.delete({ postId: id });
    await Post.delete(id);
    return true;
  }
}
