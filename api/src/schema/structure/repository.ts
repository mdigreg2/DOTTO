import { ObjectType, Field, Int } from 'type-graphql';
import { ObjectId } from 'mongodb';
import { prop as Property, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { AccessLevel } from '../users/access';

@ObjectType({ description : 'base repository' })
export class BaseRepository {
  @Field({description : 'name'})
  @Property({required: true})
  name: string;

  @Field({ description: 'owner' })
  @Property({required: true})
  owner: ObjectId;

  @Field(_type => [String], { description: 'branches' })
  @Property({ required: true, type: String })
  branches: string[];

  @Field(_type => AccessLevel, { description: 'public access level' })
  @Property({ required: true })
  public: AccessLevel;

  @Property({ required: false })
  @Field({ description: 'repository image' })
  image: string;

  @Field({ description: 'base folder containing files' })
  @Property({required: true})
  folder: ObjectId;

  @Field({ description: 'date created' })
  @Property({required: true})
  created: number;

  @Field({ description: 'date updated' })
  @Property({required: true})
  updated: number;

  @Field(_type => Int, { description: 'number of lines of code' })
  @Property({required: true})
  linesOfCode: number;

  @Field(_type => Int, { description: 'number of files' })
  @Property({required: true})
  numberOfFiles: number;
}

// elastic
@ObjectType({ description: 'repository' })
export class Repository extends BaseRepository {
  @Field()
  readonly _id?: ObjectId;

  nameSearch: string;
}

// database
@ObjectType({ description: 'repository db' })
@modelOptions({schemaOptions: {collection: 'repositories'}})
export class RepositoryDB extends BaseRepository {
  @Field()
  readonly _id: ObjectId;
}

export const RepositoryModel = getModelForClass(RepositoryDB);
