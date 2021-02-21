import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";

export const createUpdootLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Updoot | null>(
    async (keys) => {
      const updoots = await Updoot.findByIds(keys as any);
      const updootsIdToMap: Record<string, Updoot> = {};
      updoots.forEach((updoot) => {
        updootsIdToMap[`${updoot.postId}|${updoot.userId}`] = updoot;
      });
      return keys.map((k) => updootsIdToMap[`${k.postId}|${k.userId}`]);
    }
  );
