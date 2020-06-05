import React from 'react';
import { Link, PageProps } from 'gatsby';

import './index.scss';

import Layout from '../../layouts/index';
import SEO from '../../components/seo';

const NotFoundPage = (args: PageProps) => (
  <Layout location={args.location}>
    <SEO title="404" />
    <h1>NOT FOUND</h1>
    <p>The page you were looking for was not found.</p>
    <Link to="/">Go home</Link>
  </Layout>
);

export default NotFoundPage;
