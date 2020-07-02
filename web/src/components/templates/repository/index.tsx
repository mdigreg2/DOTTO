import React, { useState } from 'react';
import { Container, Table, Row, Col } from 'reactstrap';
import { PageProps, navigate } from 'gatsby';

import './index.scss';

import { useQuery } from '@apollo/react-hooks';
import { QueryResult } from '@apollo/react-common';
import { toast } from 'react-toastify';
import {
  Files,
  FilesQuery,
  FilesQueryVariables,
  RepositoryQuery,
  RepositoryQueryVariables,
  Repository,
} from 'lib/generated/datamodel';
import { isSSR } from 'utils/checkSSR';
import { client } from 'utils/apollo';
import { ApolloQueryResult } from 'apollo-client';
import { AiFillFolder, AiOutlineFile } from 'react-icons/ai';

import { RepositoryMessages } from 'locale/templates/repository/repositoryMessages';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepositoryPageDataProps extends PageProps {}

interface RepositoryProps extends RepositoryPageDataProps {
  messages: RepositoryMessages;
}

const RepositoryPage = (args: RepositoryProps): JSX.Element => {
  const splitPath = args.location.pathname.split('/');
  let repositoryName: string | undefined = undefined;
  if (splitPath.length === 3) {
    repositoryName = splitPath[2];
  } else if (splitPath.length === 4) {
    repositoryName = splitPath[3];
  }
  const [filesData, setFilesData] = useState<
    ApolloQueryResult<FilesQuery> | undefined
  >(undefined);
  const repositoryQueryRes:
    | QueryResult<RepositoryQuery, RepositoryQueryVariables>
    | undefined =
    isSSR || repositoryName === undefined
      ? undefined
      : useQuery<RepositoryQuery, RepositoryQueryVariables>(Repository, {
          variables: {
            name: repositoryName,
          },
          onCompleted: async (data) => {
            setFilesData(
              await client.query<FilesQuery, FilesQueryVariables>({
                query: Files,
                variables: {
                  repositories: [data.repository._id],
                  page: 0,
                  perpage: 1,
                },
                fetchPolicy: 'no-cache',
              })
            );
          },
          onError: (err) => {
            toast(err.message, {
              type: 'error',
            });
            navigate('/404');
          },
        });
  return (
    <Container>
      {repositoryName ? (
        <>
          {!repositoryQueryRes ||
          repositoryQueryRes.loading ||
          !repositoryQueryRes.data ||
          !filesData ||
          filesData.loading ||
          !filesData.data ? (
            <p>loading...</p>
          ) : (
            <>
              {filesData.data.files.length === 0 ? (
                <p>no files in repository {repositoryName}</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Files:</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filesData.data.files.map((file) => (
                      <tr key={file._id}>
                        <td>
                          <Row>
                            <Col>
                              <AiFillFolder />
                              <AiOutlineFile />
                            </Col>
                            <Col>{file.name}</Col>
                          </Row>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </>
      ) : (
        <p>Cannot find repository</p>
      )}
    </Container>
  );
};

export default RepositoryPage;