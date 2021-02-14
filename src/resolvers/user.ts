import argon2 from "argon2";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { MyContext } from "../types";
import {
  FieldError,
  UsernameEmailPassword,
  UserResponse,
} from "./graphql.types";
import { User } from "../entities/User";
import {
  inValidUsernameEmailPassword,
  inValidEmail,
  inValidUsername,
} from "../utils/Validators";
import { sleep } from "../utils/sleep";
import keys from "../configs/keys";
import { v4 as uuidv4 } from "uuid";
import { FORGET_PASSWORD_PREFIX } from "../constants";
import { sendEmail } from "../utils/sendEmail";

@Resolver()
export class UserResolver {
  // ME QUERY 保持會員狀態
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    return await User.findOne({ where: { id: req.session.userId } });
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, redis }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 6) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "密碼長度不得低於 6 個字元",
          },
        ],
      };
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
    const user = await User.findOne({ where: { id: userId } });

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

    // user.password = hashedPassword;
    // user.updatedAt = new Date();
    // await user.save();
    await User.update({ id: userId }, { password: hashedPassword });

    // 改變密碼後，自動登入(如果不想要自動登入，註解掉即可)
    req.session.userId = user.id;

    // 無效化憑證
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
      email,
      `<a href="http://localhost:3000/change-password/${token}">重設密碼</a>`
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

    const hashedPassword = await argon2.hash(input.password);
    const user = User.create({
      username: input.username,
      email: input.email,
      password: hashedPassword,
    });

    try {
      await user.save();
    } catch (err) {
      // console.log(err);

      if (err.code === "23505") {
        // user already exists
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

    // 設定cookie
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
    await sleep(2000);

    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(keys.cookie.name);
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
