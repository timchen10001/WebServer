import { ConnectionOptions } from "typeorm";

export default {
    cookie: {
        name: process.env.COOKIE_NAME as string,
        secret: process.env.COOKIE_SECRET as string,
    },
    db: {
        type: process.env.DATABSE_TYPE,
        database: process.env.DATABSE_NAME,
        username: process.env.DATABSE_USERNAME,
        password: process.env.DATABSE_PASSWORD
    } as ConnectionOptions
}