import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  FieldResolver,
  Info,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { InputPost, PaginatedPosts } from "./graphql.types";
import { MyContext } from "../types";
import { isAuth } from "../middlewares/isAuth";
import { getConnection, QueryBuilder } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
  return post.text.slice(0, 50);
  }

  // @FieldResolver(() => User)
  // creator(
  //   @Root() post: Post,
  //   @Ctx() { req }: MyContext
  // ): User {
  //   return 
  // }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    // 確認 value 是否非 -1 即可，不需使用實際 value
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;

    // 在 Updoot 實體中插入資料
    const { userId } = req.session;
    // await Updoot.insert({
    //   userId,
    //   postId,
    //   value: realValue,
    // });

    // 使用 SQL 更新對應的 Post 實例之特性 points
    let result: boolean = true;
    await getConnection()
      .query(
        `
        START TRANSACTION;

        insert into updoot ("userId", "postId", value) 
        values (${userId},${postId},${realValue});

        update post
        set points = points + ${realValue}
        where id = ${postId};
        
        COMMIT;
      `
      )
      .catch((err) => {
        console.log(err);
        result = false;
      });

    return result;
  }

  // find all posts
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(200, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

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
      ) creator
      from post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      replacements
    );

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect(
    //     "p.creator", // post.creator
    //     "u", // user
    //     '"u.id" = p.creatorId' // user.id == creatorId
    //   )
    //   .orderBy('p."createdAt"', "DESC")
    //   .take(realLimitPlusOne);

    // qb.where('p."creatorId" = :creatorId', {
    //   creatorId: req.session.userId,
    // });

    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany();
    // console.log("posts: ", posts);
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
      creatorId: req.session.userId
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
