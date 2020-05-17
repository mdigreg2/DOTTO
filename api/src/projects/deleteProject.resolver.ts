import { Resolver, ArgsType, Field, Args, Mutation, Ctx } from 'type-graphql';
import { projectIndexName } from '../elastic/settings';
import { elasticClient } from '../elastic/init';
import { ObjectId } from 'mongodb';
import { ProjectModel, ProjectDB } from '../schema/structure/project';
import { getLogger } from 'log4js';
import { GraphQLContext } from '../utils/context';
import { verifyLoggedIn } from '../auth/checkAuth';
import { checkAccess } from '../utils/checkAccess';
import { AccessLevel } from '../schema/auth/access';
import { UserModel } from '../schema/auth/user';
import { deleteRepositoryUtil } from '../repositories/deleteRepository.resolver';
import { RepositoryModel } from '../schema/structure/repository';

@ArgsType()
class DeleteProjectArgs {
  @Field(_type => ObjectId, { description: 'project id' })
  id: ObjectId;
}

const logger = getLogger();
export const deleteProjectUtil = async (args: DeleteProjectArgs, userID: ObjectId, project: ProjectDB): Promise<void> => {
  const deleteElasticResult = await elasticClient.delete({
    index: projectIndexName,
    id: args.id.toHexString()
  });
  logger.info(`deleted project ${JSON.stringify(deleteElasticResult.body)}`);
  await ProjectModel.deleteOne({
    _id: args.id
  });
  await UserModel.updateOne({
    _id: userID
  }, {
    $pull: {
      projects: {
        _id: args.id
      }
    }
  });
  for (const repository of project.repositories) {
    const repositoryID = await RepositoryModel.findById(repository);
    if (!repositoryID) continue;
    await deleteRepositoryUtil({ id: repository }, userID, repositoryID);
  }
};
@Resolver()
class DeleteProjectResolver {
  @Mutation(_returns => String)
  async deleteProject(@Args() args: DeleteProjectArgs, @Ctx() ctx: GraphQLContext): Promise<string> {
    if (!verifyLoggedIn(ctx) || !ctx.auth) {
      throw new Error('user not logged in');
    }
    const project = await ProjectModel.findById(args.id);
    if (!project) {
      throw new Error(`cannot find project with id ${args.id.toHexString()}`);
    }
    const userID = new ObjectId(ctx.auth.id);
    if (!checkAccess(userID, project.access, AccessLevel.admin)) {
      throw new Error('user does not have admin access to project');
    }
    await deleteProjectUtil(args, userID, project);
    return `deleted project with id: ${args.id.toHexString()}`;
  }
}

export default DeleteProjectResolver;