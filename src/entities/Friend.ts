import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,

  PrimaryGeneratedColumn
} from "typeorm";

// user <-> otheruser
// user -> friend <- otheruser

@ObjectType()
@Entity()
export class Friend extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // 好友等級
  @Column({ type: "int", default: 0 })
  value: number;

  // sender id
  @Column({ type: "int" })
  userId: number;
  
  @Column({ type: "int" })
  receiverId: number;

  @Field()
  @Column({ nullable: true })
  ID: number;

  @Field()
  @Column({ nullable: true })
  name: string;

}
