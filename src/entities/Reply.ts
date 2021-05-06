import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Reply extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  replierId!: number;

  @Field(() => User)
  replier: User;

  @Field()
  @Column()
  postId: number;

  @Field()
  @Column()
  content: string;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
