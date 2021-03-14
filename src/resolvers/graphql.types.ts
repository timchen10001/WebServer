import { Field, InputType, Int, ObjectType } from "type-graphql";
import { Post } from "../entities/Post";
import { Reply } from "../entities/Reply";
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

  @Field()
  images?: string;
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class ReplyResponse {
  @Field(() => Reply, { nullable: true })
  reply?: Reply;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@InputType()
export class PostReplyInput {
  @Field(() => Int)
  postId!: number;

  @Field()
  content!: string;
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
