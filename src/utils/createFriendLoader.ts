import DataLoader from "dataloader";
import { Friend } from "../entities/Friend";

export const createFriendLoader = () =>
  new DataLoader<{ value: number; receiverId: number }, Friend | null>(
    async (keys) => {
        // console.log(keys);
        const friends = await Friend.findByIds(keys as any);
        // console.log(friends);
        const friendIdToMap: Record<string, Friend> = {};
        friends.forEach((friend) => {
            friendIdToMap[`${friend.receiverId}`] = friend;
        })
        return keys.map(key => friendIdToMap[`${key.receiverId}`]);
    }
  );
