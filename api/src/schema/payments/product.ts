import { prop as Property, getModelForClass, modelOptions } from '@typegoose/typegoose';
import Plan from './plan';
import Restrictions from './restrictions';
import { ObjectType, Field } from 'type-graphql';

@ObjectType({ description: 'products' })
@modelOptions({ schemaOptions: { collection: 'products' } })
export default class Product extends Restrictions {
  @Field({ description: 'product name' })
  @Property({ required: true })
  name: string;

  @Field({ description: 'stripe id' })
  @Property({ required: true })
  stripeID: string;

  @Field(_type => [Plan], { description: 'plans' })
  @Property({ required: true, type: Plan })
  plans: Plan[];
}

export const ProductModel = getModelForClass(Product);