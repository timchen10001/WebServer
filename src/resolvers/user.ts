import argon2 from "argon2";
import { display } from "../utils/display";
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { Friend } from "../entities/Friend";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { sendEmail } from "../utils/sendEmail";
import { sleep } from "../utils/sleep";
import {
  inValidEmail,
  inValidPassword,
  inValidUsername,
  inValidUsernameEmailPassword,
} from "../utils/validators";
import {
  FieldError,
  UsernameEmailPassword,
  UserResponse,
} from "./graphql.types";
import { isAuth } from "../middlewares/isAuth";

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  username(@Root() user: User) {
    return display(user.username);
  }

  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // 檢查請求者是否是信箱持有者
    if (req.session.userId === user.id) {
      return display(user.email);
    }
    // 不顯示非本人的信箱
    return "";
  }

  @FieldResolver(() => [Friend])
  friends(@Root() user: User, @Ctx() { req, friendLoader }: MyContext) {
    return friendLoader.load({
      value: 1,
      receiverId: user.id,
    });
  }

  // ME QUERY 保持會員狀態
  @Query(() => User, { nullable: true })
  me(@Ctx() { req, userLoader }: MyContext) {
    if (req.session.userId) {
      return userLoader.load(req.session.userId);
    }
    return null;
  }

  // 查看自己的好友邀請
  @UseMiddleware(isAuth)
  @Query(() => [Friend], { nullable: true })
  receives(@Ctx() { req, friendLoader }: MyContext) {
    return friendLoader.load({
      value: 0,
      receiverId: req.session.userId,
    });
  }

  // UPDATE USER.PASSWORD 透過信箱重設密碼
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, redis, userLoader }: MyContext
  ): Promise<UserResponse> {
    const errors = inValidPassword(newPassword, "newPassword");
    if (errors) {
      return { errors };
    }

    await sleep(2000);

    const key = FORGET_PASSWORD_PREFIX + token;
    const userIdStr = await redis.get(key);

    if (!userIdStr)
      return {
        errors: [
          {
            field: "token",
            message: "憑證已經過期",
          },
        ],
      };

    const userId = parseInt(userIdStr);
    const user = await userLoader.load(userId);

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "使用者已不存在",
          },
        ],
      };
    }

    // 改變密碼
    const hashedPassword = await argon2.hash(newPassword);

    await User.update({ id: userId }, { password: hashedPassword });

    // 改變密碼後，自動登入(選擇性註解)
    req.session.userId = user.id;

    // 無效化使用過的憑證
    await redis.del(key);

    return { user };
  }

  // FORGET_PASSWORD 忘記密碼
  @Mutation(() => Boolean)
  async forgetPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<boolean> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return true;
    }

    const token = uuidv4();

    // 設定 Redis Store
    // 重設密碼憑證
    redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id, // key
      "ex",
      30 * 60 * 1000 // 30 分鐘後過期
    );

    await sendEmail(
      display(email),
      `<a href="${process.env.CORS_ORIGIN}/change-password/${token}">重設密碼</a>`
    );

    return true;
  }

  // REGISTER 註冊
  @Mutation(() => UserResponse)
  async register(
    @Arg("input") input: UsernameEmailPassword,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    await sleep(2000);
    const errors = inValidUsernameEmailPassword(input);
    if (errors) return { errors };

    const seed = Math.floor(Math.random() * 5000);
    const hashedPassword = await argon2.hash(input.password);
    const user = User.create({
      username: input.username,
      avator: `https://avatars.dicebear.com/api/male/${seed}.svg`,
      email: input.email,
      password: hashedPassword,
    });

    try {
      await user.save();
    } catch (err) {
      // console.log(err);

      if (err.code === "23505") {
        // 重複註冊
        if (err.detail.includes("username")) {
          return {
            errors: [
              {
                field: "username",
                message: "使用者名稱已被註冊",
              },
            ],
          };
        } else if (err.detail.includes("email")) {
          return {
            errors: [
              {
                field: "email",
                message: "該信箱已被註冊",
              },
            ],
          };
        }
      }
    }

    // 設定cookie (如果要求客戶註冊完重新登入的話，選擇性註解)
    req.session.userId = user.id;

    return { user };
  }

  // LOGIN 登入
  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    await sleep(2000);

    const field = { usernameOrEmail: "usernameOrEmail", password: "password" };
    const inputIsEmail = usernameOrEmail.includes("@");

    let errors: FieldError[] | undefined;
    // 操作DB前，先確認數入資料是否符合規範
    if (inputIsEmail) {
      errors = inValidEmail(usernameOrEmail, field.usernameOrEmail);
    } else {
      errors = inValidUsername(usernameOrEmail, field.usernameOrEmail);
    }

    if (errors) return { errors };

    // 處理 user
    const user = await User.findOne({
      where: inputIsEmail
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail },
    });
    if (!user) {
      return {
        errors: [
          {
            field: field.usernameOrEmail,
            message: "使用者名稱或信箱不存在",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: field.password,
            message: "密碼錯誤",
          },
        ],
      };
    }

    // 設定cookie
    req.session.userId = user.id;

    return { user };
  }

  // LOGOUT 登出
  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    await sleep(1000);

    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME || "");
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
