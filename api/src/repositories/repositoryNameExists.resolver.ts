/* eslint-disable @typescript-eslint/camelcase */

import { Resolver, ArgsType, Args, Query, Field, Ctx } from 'type-graphql';
import { ObjectId } from 'mongodb';
import { repositoryIndexName } from '../elastic/settings';
import { GraphQLContext } from '../utils/context';
import { verifyLoggedIn } from '../auth/checkAuth';
import User, { UserModel } from '../schema/auth/user';
import { elasticClient } from '../elastic/init';
import { TermQuery } from '../elastic/types';
import { RequestParams } from '@elastic/elasticsearch';
import { Matches } from 'class-validator';
import { validRepositoryName } from '../utils/variables';
import { RepositoryModel } from '../schema/structure/repository';
import { getUser } from '../users/shared';

@ArgsType()
class RepositoryExistsArgs {
  @Field({ description: 'repository name' })
  @Matches(validRepositoryName, {
    message: 'invalid characters provided for repository name'
  })
  name: string;

  @Field({ description: 'repository owner', nullable: true })
  owner?: string;
}

interface CountResponse {
  count: number;
}

export const countRepositoriesUserAccess = async (user: User, name?: string): Promise<number> => {
  const shouldParams: TermQuery[] = [];
  if (user.repositories.length === 0 && user.projects.length === 0) {
    return 0;
  }
  for (const project of user.projects) {
    shouldParams.push({
      term: {
        project: project._id.toHexString()
      }
    });
  }
  for (const repository of user.repositories) {
    shouldParams.push({
      term: {
        _id: repository._id.toHexString()
      }
    });
  }
  const mustParams: TermQuery[] = [];
  if (name) {
    mustParams.push({
      term: {
        name: name.toLowerCase()
      }
    });
  }
  const searchParams: RequestParams.Search = {
    index: repositoryIndexName,
    body: {
      query: {
        bool: {
          must: mustParams,
          filter: {
            bool: {
              should: shouldParams
            }
          }
        }
      }
    }
  };
  const elasticRepositoryData = await elasticClient.count(searchParams);
  const countData = elasticRepositoryData.body as CountResponse;
  return countData.count;
};

export const countRepositories = async (owner: ObjectId, name?: string): Promise<number> => {
  return await RepositoryModel.count({
    owner,
    name
  });
};

@Resolver()
class RepositoryNameExistsResolver {
  @Query(_returns => Boolean)
  async repositoryNameExists(@Args() args: RepositoryExistsArgs, @Ctx() ctx: GraphQLContext): Promise<boolean> {
    if (!args.owner) {
      if (!verifyLoggedIn(ctx) || !ctx.auth) {
        throw new Error('user not logged in');
      }
      const userID = new ObjectId(ctx.auth.id);
      const user = await UserModel.findById(userID);
      if (!user) {
        throw new Error('cannot find user');
      }
      return (await countRepositoriesUserAccess(user, args.name)) > 0;
    } else {
      const ownerData = await getUser(args.owner);
      return (await countRepositories(ownerData._id, args.name)) > 0;
    }
  }
}

export default RepositoryNameExistsResolver;