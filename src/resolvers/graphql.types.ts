import { User } from "../entities/User";
import { Field, InputType, ObjectType } from "type-graphql";
import { Post } from "../entities/Post";

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
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
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

@ObjectType()
export class InvitationResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Boolean, { nullable: true })
  done?: boolean;
}
