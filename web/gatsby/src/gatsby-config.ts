import path from 'path';
import { config } from 'dotenv';
import { print } from 'graphql/language/printer';
import gql from 'graphql-tag';
import { languageOptions, defaultLanguage } from './languages';

config();

/* eslint @typescript-eslint/no-unused-vars: 0 */

export default {
  siteMetadata: {
    title: 'reScribe',
    description: 'search engine for code',
    author: 'rescribe',
    siteUrl: process.env.GATSBY_SITE_URL,
    languages: {
      default: defaultLanguage,
      options: languageOptions,
    },
  },
  plugins: [
    // fix ssr with aphrodite
    'gatsby-plugin-aphrodite',
    'gatsby-plugin-react-helmet-async',
    // Add typescript stack into webpack
    'gatsby-plugin-typescript',
    {
      resolve: 'gatsby-plugin-sass',
      options: {
        implementation: require('sass'),
      },
    },
    // You can have multiple instances of this plugin
    // to read source nodes from different locations on your
    // filesystem.
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: path.resolve('./src/assets/images'),
        name: 'images',
        ignore: ['**/.*'], // ignore files starting with a dot
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'files',
        path: path.resolve('./src/files'),
        ignore: ['**/.*'], // ignore files starting with a dot
      },
    },
    'gatsby-transformer-sharp',
    'gatsby-plugin-sharp',
    {
      resolve: 'gatsby-plugin-netlify',
      options: {
        headers: {}, // option to add more headers. `Link` headers are transformed by the below criteria
        allPageHeaders: [], // option to add headers for all pages. `Link` headers are transformed by the below criteria
        mergeSecurityHeaders: true, // boolean to turn off the default security headers
        mergeLinkHeaders: true, // boolean to turn off the default gatsby js headers
        mergeCachingHeaders: true, // boolean to turn off the default caching headers
        generateMatchPathRewrites: false, // boolean to turn off automatic creation of redirect rules for client only paths
      },
    },
    {
      resolve: 'gatsby-plugin-typography',
      options: {
        pathToConfigModule: './gatsby/.gatsby/typography',
      },
    },
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'reScribe',
        short_name: 'rescribe',
        start_url: '/',
        background_color: '#a2466c',
        theme_color: '#a2466c',
        display: 'standalone',
        icon: 'src/assets/images/icon.svg',
      },
    },
    'gatsby-plugin-offline',
    'gatsby-plugin-remove-trailing-slashes',
    'gatsby-plugin-styled-components',
    {
      resolve: 'gatsby-plugin-create-client-paths',
      options: { prefixes: [] },
    },
    {
      resolve: 'gatsby-plugin-canonical-urls',
      options: {
        siteUrl: process.env.GATSBY_SITE_URL,
      },
    },
    {
      resolve: 'gatsby-plugin-google-analytics',
      options: {
        // The property ID; the tracking code won't be generated without it
        trackingId: process.env.GATSBY_GOOGLE_ANALYTICS_ID,
        // Defines where to place the tracking script - `true` in the head and `false` in the body
        head: false,
        // Setting this parameter is optional
        anonymize: true,
        // Setting this parameter is also optional
        respectDNT: true,
        // Avoids sending pageview hits from custom paths
        exclude: [],
        // Delays sending pageview hits on route update (in milliseconds)
        pageTransitionDelay: 0,
        // Enables Google Optimize using your container Id
        optimizeId: process.env.GATSBY_GOOGLE_OPTIMIZE_ID
          ? process.env.GATSBY_GOOGLE_OPTIMIZE_ID
          : undefined,
        // Enables Google Optimize Experiment ID
        experimentId: process.env.GATSBY_GOOGLE_EXPERIMENT_ID
          ? process.env.GATSBY_GOOGLE_EXPERIMENT_ID
          : undefined,
        // Set Variation ID. 0 for original 1,2,3....
        variationId: process.env.GATSBY_GOOGLE_VARIATION_ID
          ? process.env.GATSBY_GOOGLE_VARIATION_ID
          : undefined,
        // Defers execution of google analytics script after page load
        defer: true,
        // Any additional optional fields
      },
    },
    {
      resolve: 'gatsby-plugin-webpack-bundle-analyser-v2',
      options: {
        analyzerPort: 8001,
        devMode: false,
      },
    },
    {
      resolve: 'gatsby-plugin-i18n',
      options: {
        langKeyDefault: defaultLanguage,
        useLangKeyLayout: false,
        prefixDefault: true, // create pages for default language
      },
    },
    {
      resolve: 'gatsby-plugin-sitemap',
      options: {
        output: '/sitemap-main.xml',
        exclude: [],
        query: print(gql`
          {
            site {
              siteMetadata {
                siteUrl
              }
            }
            allSitePage {
              nodes {
                path
              }
            }
          }
        `),
        serialize: ({
          site,
          allSitePage,
        }: {
          site: { siteMetadata: { siteUrl: string } };
          allSitePage: { nodes: { path: string }[] };
        }): { url: string; changefreq: string; priority: number }[] => {
          return allSitePage.nodes
            .filter((node) => {
              return !node.path.includes(':');
            })
            .map((node) => {
              return {
                url: `${site.siteMetadata.siteUrl}${node.path}`,
                changefreq: 'daily',
                priority: 0.7,
              };
            });
        },
      },
    },
    // see https://github.com/jlengstorf/gatsby-hasura-realtime-app
    // `gatsby-source-graphql`,
  ],
};
