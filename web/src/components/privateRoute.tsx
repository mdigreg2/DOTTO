import { navigate, PageProps } from 'gatsby';
import { isLoggedIn } from '../state/auth/getters';
import React, { useState } from 'react';
import { isInProject } from '../state/project/getters';

interface Input extends PageProps {
  component: (args: PageProps) => JSX.Element;
  requiresProject?: boolean;
}

const PrivateRoute = (args: Input) => {
  const pageArgs: PageProps = args;
  const childComponent = args.component(pageArgs);
  const [isLoading, setLoading] = useState(true);
  isLoggedIn()
    .then((loggedIn) => {
      if (!loggedIn) {
        navigate('/login');
      } else if (args.requiresProject && !isInProject()) {
        navigate('/app/account');
      } else {
        setLoading(false);
      }
    })
    .catch((_err) => {
      navigate('/login');
    });
  return <>{isLoading ? null : childComponent}</>;
};

export default PrivateRoute;
