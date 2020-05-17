/* eslint-disable @typescript-eslint/camelcase */
import { Resolver, ArgsType, Args, Query, Field, Ctx } from 'type-graphql';
import { ObjectId } from 'mongodb';
import { Repository } from '../schema/structure/repository';
import { repositoryIndexName } from '../elastic/settings';
import { GraphQLContext } from '../utils/context';
import { verifyLoggedIn } from '../auth/checkAuth';
import { UserModel } from '../schema/auth/user';
import { elasticClient } from '../elastic/init';
import { checkRepositoryAccess } from './auth';
import { AccessLevel } from '../schema/auth/access';
import { TermQuery } from '../elastic/types';

@ArgsType()
class RepositoryArgs {
  @Field(_type => ObjectId, { description: 'repository id', nullable: true })
  id?: ObjectId;

  @Field(_type => ObjectId, { description: 'project id', nullable: true })
  project?: ObjectId;

  @Field({ description: 'project id', nullable: true })
  name?: string;
}

@Resolver()
class RepositoryResolver {
  @Query(_returns => Repository)
  async repository(@Args() args: RepositoryArgs, @Ctx() ctx: GraphQLContext): Promise<Repository> {
    if (!verifyLoggedIn(ctx) || !ctx.auth) {
      throw new Error('user not logged in');
    }
    const userID = new ObjectId(ctx.auth.id);
    const user = await UserModel.findById(userID);
    if (!user) {
      throw new Error('cannot find user data');
    }
    let repository: Repository;
    if (args.id) {
      const repositoryData = await elasticClient.get({
        id: args.id.toHexString(),
        index: repositoryIndexName
      });
      repository = {
        ...repositoryData.body._source as Repository,
        _id: new ObjectId(repositoryData.body._id as string)
      };
    } else if (args.name && args.project) {
      const shouldParams: TermQuery[] = [];
      for (const project of user.projects) {
        shouldParams.push({
          term: {
            project: project._id.toHexString()
          }
        });
      }
      const mustParams: TermQuery[] = [{
        term: {
          name: args.name
        }
      }, {
        term: {
          project: args.project.toHexString()
        }
      }];
      const repositoryData = await elasticClient.search({
        index: repositoryIndexName,
        body: {
          query: {
            bool: {
              should: shouldParams,
              must: mustParams
            }
          }
        }
      });
      if (repositoryData.body.hits.hits.length === 0) {
        throw new Error('could not find repository');
      }
      repository = {
        ...repositoryData.body.hits.hits[0]._source as Repository,
        _id: new ObjectId(repositoryData.body.hits.hits[0]._id as string)
      };
    } else {
      throw new Error('user must supply name or id');
    }
    if (!checkRepositoryAccess(user, repository.project, repository._id as ObjectId, AccessLevel.view)) {
      throw new Error('user not authorized to view repository');
    }
    return repository;
  }
}

export default RepositoryResolver;