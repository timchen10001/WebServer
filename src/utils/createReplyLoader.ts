import DataLoader from "dataloader";
import { Reply } from "../entities/Reply";

export const createReplyLoader = () =>
  new DataLoader<{ postId: number }, Reply[]>(async (keys) => {
    const replies = await Reply.find({ where: keys });
    const postIdToMap: Record<number, Reply[]> = {};
    replies.forEach((reply) => {
      if (postIdToMap[reply.postId]) {
        postIdToMap[reply.postId].push(reply);
      } else {
        postIdToMap[reply.postId] = [reply];
      }
    });
    return keys.map((k) =>
      postIdToMap[k.postId] ? postIdToMap[k.postId] : []
    );
  });
