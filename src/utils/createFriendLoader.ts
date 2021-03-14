import DataLoader from "dataloader";
import { Friend } from "../entities/Friend";

const stringifyFriendKey = (
  value?: number,
  userId?: number,
  receiverId?: number
) => `value=${value}|userId=${userId}|receiverId=${receiverId}`;

export const createFriendLoader = () =>
  new DataLoader<
    { value?: number; userId?: number; receiverId?: number },
    Friend[]
  >(async (keys) => {
    const key = keys[0];
    const friends = await Friend.find({ where: key as any });
    const friendsInfoToMap: Record<string, Friend[]> = {};

    friends.forEach((friend) => {
      const stringifyKey = stringifyFriendKey(
        key.value || key.value === 0 ? friend.value : undefined,
        !key.userId ? undefined : friend.userId,
        !key.receiverId ? undefined : friend.receiverId
      );
      if (typeof friendsInfoToMap[stringifyKey] !== "undefined") {
        friendsInfoToMap[stringifyKey].push(friend);
      } else {
        friendsInfoToMap[stringifyKey] = [friend];
      }
    });
    return keys.map((k) => {
      const stringifyKey = stringifyFriendKey(k.value, k.userId, k.receiverId);
      return friendsInfoToMap[stringifyKey]
        ? friendsInfoToMap[stringifyKey]
        : [];
    });
  });
