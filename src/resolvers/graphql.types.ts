import { Field, InputType, ObjectType } from "type-graphql";
import { Post } from "../entities/Post";
import { User } from "../entities/User";

// error
@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

// Post
@InputType()
export class InputPost {
  @Field()
  title!: string;

  @Field()
  text!: string;

  @Field(() => String, { nullable: true })
  images?: string;
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@InputType()
export class CloudinaryImageInfo {
  encoding: string;
  fieldname: string;
  filename: string;
  mimetype: string;
  originalname: string;
  path: string;
  size: number;
}

// User
@InputType()
export class UsernameEmailPassword {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

// Friend
@ObjectType()
export class InvitationResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Boolean, { nullable: true })
  done?: boolean;
}
