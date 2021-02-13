import { User } from "../entities/User";
import { Field, InputType, ObjectType } from "type-graphql";

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