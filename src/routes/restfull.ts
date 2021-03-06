import { Express } from "express";
import multer from "multer";
import { __prod__ } from "../constants";
import { Friend } from "../entities/Friend";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { storage } from "../services/storage";

export default function restfull(app: Express) {
  const upload = multer({
    storage,
    limits: {
      fieldSize: 20 * 1024 * 1024,
    },
    fileFilter(_, file, callback) {
      if (!file.mimetype.match(/^image/)) {
        callback(new Error("檔案格式錯誤"));
      } else {
        callback(null, true);
      }
    },
  });

  app.post("/upload", upload.array("image"), async (req: any, res, next) => {
    console.log("files: => ", req.files);
    let pathStream = "";
    for (let i = 0; i < req.files.length; i++) {
      pathStream += req.files[i].path + "&";
    }
    res.send(pathStream);
  });

  if (!__prod__) {
    app.get("/all_users", async (_, res) => {
      const user = await User.find({});
      res.send(user);
    });

    app.get("/all_posts", async (_, res) => {
      const posts = await Post.find({});
      res.send(posts);
    });

    app.get("/all_friends", async (_, res) => {
      const friends = await Friend.find({});
      res.send(friends);
    });
  }
}
