import React, { useEffect } from 'react';
import { Container } from 'reactstrap';
import SearchBar from './SearchBar';
import './index.scss';
import { isSSR } from 'utils/checkSSR';
import { useQuery } from '@apollo/react-hooks';
import {
  HelloQuery,
  Hello,
  VerifyEmailMutation,
  VerifyEmailMutationVariables,
  VerifyEmail,
} from 'lib/generated/datamodel';
// import NavCard from 'components/pages/NaviagtionCard';
import { PageProps, navigate } from 'gatsby';
import { FixedObject } from 'gatsby-image';
import Newsletter from './Newsletter';
import { client } from 'utils/apollo';
import { toast } from 'react-toastify';
import { IndexMessages } from 'locale/pages/index/indexMessages';

export interface IndexPageProps extends PageProps {
  data: {
    file: {
      childImageSharp: {
        fixed: FixedObject;
      };
    };
  };
}

interface IndexPageContentProps extends IndexPageProps {
  messages: IndexMessages;
}

const IndexPage = (args: IndexPageContentProps): JSX.Element => {
  if (!isSSR) {
    console.log(useQuery<HelloQuery | undefined>(Hello).data?.hello);
  }
  useEffect(() => {
    let verifyEmail = false;
    let newsletterToken: string | undefined = undefined;
    if (args.location.search.length > 0) {
      const searchParams = new URLSearchParams(args.location.search);
      if (searchParams.has('token')) {
        newsletterToken = searchParams.get('token') as string;
      }
      if (searchParams.has('verify_newsletter')) {
        verifyEmail = true;
      }
    }
    if (verifyEmail && newsletterToken !== undefined) {
      client
        .mutate<VerifyEmailMutation, VerifyEmailMutationVariables>({
          mutation: VerifyEmail,
          variables: {
            token: newsletterToken,
          },
        })
        .then((res) => {
          let message = res.data?.verifyEmail;
          if (!message) {
            message = 'email successfully verified for newsletter';
          }
          toast(message, {
            type: 'success',
          });
          navigate('/');
        })
        .catch((err) => {
          toast(err.message, {
            type: 'error',
          });
          return;
        });
    }
  }, []);
  // const loremText =
  //   'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ultricies porttitor ullamcorper. Lorem ipsum dolor sit amet, consectetur adipiscing elit';
  return (
    <>
      <Container className="default-container">
        <SearchBar />
        {/*<NavCard
            title="Intuitive search"
            subtitle="optional subtitle"
            image={args.data.file.childImageSharp.fixed}
            body={loremText}
            linkText="read more"
            linkSlug="/"
          />
          <NavCard
            title="Write Better Code"
            subtitle="optional subtitle"
            image={args.data.file.childImageSharp.fixed}
            body={loremText}
            linkText="read more"
            linkSlug="/"
          />
          <NavCard
            title="Extendable"
            subtitle="optional subtitle"
            image={args.data.file.childImageSharp.fixed}
            body={loremText}
            linkText="read more"
            linkSlug="/"
          />*/}
      </Container>
      <Newsletter />
    </>
  );
};

export default IndexPage;