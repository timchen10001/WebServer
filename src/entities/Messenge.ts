import { ObjectType } from "type-graphql";
import { BaseEntity, Entity, PrimaryGeneratedColumn } from "typeorm";

@ObjectType()
@Entity()
export class Messenge extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

}