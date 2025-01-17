
import { ObjectID } from 'mongodb';
import argon2 from 'argon2';
import { GraphQLContext } from '../utils/context';
import { Resolver, ArgsType, Field, Args, Ctx, Mutation } from 'type-graphql';
import { IsEmail, MinLength, Matches, IsOptional } from 'class-validator';
import { passwordMinLen, specialCharacterRegex, numberRegex, lowercaseLetterRegex, capitalLetterRegex } from '../shared/variables';
import { verifyLoggedIn } from '../auth/checkAuth';
import { UserModel } from '../schema/users/user';

@ArgsType()
class UpdateArgs {
  @Field(_type => String, { description: 'name', nullable: true })
  @IsOptional()
  name?: string;

  @Field(_type => String, { description: 'email', nullable: true })
  @IsOptional()
  @IsEmail({}, {
    message: 'invalid email provided'
  })
  email: string;

  @Field(_type => String, { description: 'password', nullable: true })
  @IsOptional()
  @MinLength(passwordMinLen, {
    message: `password must contain at least ${passwordMinLen} characters`
  })
  @Matches(lowercaseLetterRegex, {
    message: 'no lowercase letter found'
  })
  @Matches(capitalLetterRegex, {
    message: 'no capital letter found'
  })
  @Matches(numberRegex, {
    message: 'no number found'
  })
  @Matches(specialCharacterRegex, {
    message: 'no special characters found'
  })
  password: string;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
}

@Resolver()
class UpdateAccountResolver {
  @Mutation(_returns => String)
  async updateAccount(@Args() { name, email, password }: UpdateArgs, @Ctx() ctx: GraphQLContext): Promise<string> {
    if (!verifyLoggedIn(ctx) || !ctx.auth) {
      throw new Error('user not logged in');
    }
    const userUpdateData: UserUpdateData = {};
    if (name && name.length > 0) {
      userUpdateData.name = name;
    }
    if (email) {
      userUpdateData.email = email;
    }
    if (password) {
      userUpdateData.password = await argon2.hash(password);
    }
    const userID = new ObjectID(ctx.auth?.id);
    await UserModel.updateOne({
      id: userID,
    }, userUpdateData);
    return `updated user ${userID.toHexString()}`;
  }
}

export default UpdateAccountResolver;
