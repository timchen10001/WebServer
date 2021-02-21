import DataLoader from "dataloader";
import { User } from "../entities/User";

// 傳入 使用者 id，回傳對應的使用者 query
// keys -> [1, 56, 34, 8]
// return -> [{ id:1, ...}, { id:56, ...}, { id:34, ...}, { id:8, ...}]
export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });
    return userIds.map((userId) => userIdToUser[userId]);
  });
