import { Resolver, ArgsType, Field, Args, Ctx, Query } from 'type-graphql';
import File from '../schema/structure/file';
import { GraphQLContext } from '../utils/context';
import { verifyLoggedIn } from '../auth/checkAuth';
import { ObjectId } from 'mongodb';
import { UserModel } from '../schema/auth/user';
import { checkRepositoryAccess, checkRepositoryPublic } from '../repositories/auth';
import { AccessLevel } from '../schema/auth/access';
import { elasticClient } from '../elastic/init';
import { fileIndexName } from '../elastic/settings';

@ArgsType()
class FileArgs {
  @Field(_type => ObjectId, { description: 'file id' })
  id: ObjectId;
}

@Resolver()
class FileResolver {
  @Query(_returns => File)
  async file(@Args() args: FileArgs, @Ctx() ctx: GraphQLContext): Promise<File> {
    const fileData = await elasticClient.get({
      id: args.id.toHexString(),
      index: fileIndexName
    });
    const file: File = {
      ...fileData.body._source as File,
      _id: new ObjectId(fileData.body._id as string)
    };
    const repositoryID = new ObjectId(file.repository);
    if (await checkRepositoryPublic(repositoryID, AccessLevel.view)) {
      return file;
    }
    if (!verifyLoggedIn(ctx) || !ctx.auth) {
      throw new Error('user not logged in');
    }
    const userID = new ObjectId(ctx.auth.id);
    const user = await UserModel.findById(userID);
    if (!user) {
      throw new Error('cannot find user data');
    }
    if (!(await checkRepositoryAccess(user, repositoryID, AccessLevel.view))) {
      throw new Error('user not authorized to view file');
    }
    return file;
  }
}

export default FileResolver;
