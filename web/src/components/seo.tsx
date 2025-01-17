/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { useStaticQuery, graphql } from 'gatsby';
import { defaultLanguage } from 'shared/languages';

interface ArgProps {
  description: string;
  lang: any;
  meta: any;
  title: string;
}

const SEO = (args: ArgProps): JSX.Element => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            author
          }
        }
      }
    `
  );

  const metaDescription = args.description || site.siteMetadata.description;
  return (
    <Helmet
      htmlAttributes={{
        lang: args.lang,
      }}
      title={args.title}
      titleTemplate={`%s | ${site.siteMetadata.title}`}
      script={[
        {
          src: `https://www.google.com/recaptcha/api.js?render=${process.env.GATSBY_RECAPTCHA_SITE_KEY}`,
          defer: true,
        },
        {},
      ]}
      meta={[
        {
          name: 'description',
          content: metaDescription,
        },
        {
          property: 'og:title',
          content: args.title,
        },
        {
          property: 'og:description',
          content: metaDescription,
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          name: 'twitter:card',
          content: 'summary',
        },
        {
          name: 'twitter:creator',
          content: site.siteMetadata.author,
        },
        {
          name: 'twitter:title',
          content: args.title,
        },
        {
          name: 'twitter:description',
          content: metaDescription,
        },
      ].concat(args.meta)}
    />
  );
};

SEO.defaultProps = {
  lang: defaultLanguage,
  meta: [],
  description: '',
};

SEO.propTypes = {
  description: PropTypes.string,
  lang: PropTypes.string,
  meta: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string.isRequired,
};

export default SEO;
