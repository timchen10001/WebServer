import { Friend } from "../entities/Friend";
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
import { User } from "../entities/User";
import { isAuth } from "../middlewares/isAuth";
import { MyContext } from "../types";
import { InvitationResponse } from "./graphql.types";
import { getConnection } from "typeorm";

@Resolver(Friend)
export class FriendResolver {
  @FieldResolver(() => User)
  user(@Root() friend: Friend, @Ctx() { req, userLoader }: MyContext) {
    let id = 0;
    switch (req.session.userId) {
      case friend.userId:
        id = friend.receiverId;
        break;
      case friend.receiverId:
        id = friend.userId;
        break;
    }
    return userLoader.load(id);
  }

  @UseMiddleware(isAuth)
  @Mutation(() => Boolean)
  async respondToReceive(
    @Arg("inviterId", () => Int) inviterId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    // 避免回應自己的邀請
    if (req.session.userId === inviterId) {
      return false;
    }

    // 檢查是否為被邀請者
    const receive = await getConnection().query(
      `
      select from friend
      where "value" = $1 and "receiverId" = $2 and "userId" = $3
      `,
      [0, req.session.userId, inviterId]
    );

    if (!receive) {
      return false;
    }

    try {
      await getConnection().transaction(async (tm) => {
        if (value !== 0) {
          // accept
          await tm.query(
            `
                  update friend
                  set value = $1
                  where "receiverId" = $2 and "userId" = $3
              `,
            [1, req.session.userId, inviterId]
          );
          await tm.query(
            `
                insert into friend ("userId", "receiverId", value)
                values ($1, $2, $3)
            `,
            [req.session.userId, inviterId, 1]
          );
        } else if (value === 0) {
          // deny
          await tm.query(
            `
                  delete from friend
                  where "receiverId" = $1 and "userId" = $2
              `,
            [req.session.userId, inviterId]
          );
        }
      });
    } catch (err) {
      console.log(err);
      return false;
    }
    return true;
  }

  // Add Friends 送出好友邀請
  @UseMiddleware(isAuth)
  @Mutation(() => InvitationResponse)
  async invite(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<InvitationResponse> {
    if (req.session.userId === id) {
      return {
        errors: [
          {
            field: "id",
            message: "不得邀請自己",
          },
        ],
      };
    }

    const targetAgent = await User.findOne(id);
    // 目標使用者不存在
    if (!targetAgent) {
      return {
        errors: [
          {
            field: "invitation",
            message: "使用者不存在",
          },
        ],
      };
    }

    let receiver: any;
    if (
      (receiver = await Friend.findOne({
        where: {
          userId: req.session.userId,
          receiverId: targetAgent.id,
        },
      })) ||
      (receiver = await Friend.findOne({
        where: {
          userId: targetAgent.id,
          receiverId: req.session.userId,
        },
      }))
    ) {
      return { done: false };
    }
    let done: boolean = true;
    // 若友誼關係不存在或是沒有回應 -> 發送邀請函
    if (!receiver?.value) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
            insert into friend ("userId", "receiverId", value)
            values ($1, $2, $3)
         `,
          [req.session.userId, id, 0]
        );
      });
    } else if (receiver?.value) {
      done = false;
    }

    return { done };
  }

  @UseMiddleware(isAuth)
  @Mutation(() => Boolean)
  async deleteFriend(@Arg("id") id: number, @Ctx() { req }: MyContext) {
    // 防止刪除自己與自己之好友關係對資料庫的負擔
    if (req.session.userId === id) {
      return false;
    }
    try {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          delete from friend
          where "value" = $1 and "userId" = $2 and "receiverId" = $3
          `,
          [1, id, req.session.userId]
        );
        await tm.query(
          `
          delete from friend
          where "value" = $1 and "userId" = $2 and "receiverId" = $3
          `,
          [1, req.session.userId, id]
        );
      });
    } catch (err) {
      console.log(err);
      return false;
    }
    return true;
  }

  // 查看自己的好友邀請
  @UseMiddleware(isAuth)
  @Query(() => [Friend], { nullable: true })
  receives(@Ctx() { req }: MyContext) {
    return Friend.find({
      where: {
        value: 0,
        receiverId: req.session.userId,
      },
    });
  }
}
