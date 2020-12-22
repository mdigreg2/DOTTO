import React from 'react';
import { CardText, Card, CardBody } from 'reactstrap';
import './index.scss';
import logoBlack from 'assets/images/logo-black.svg';
import { Link } from 'gatsby';

interface DescriptionArgs {
  repo: string;
  desc: string;
}
const Description = (args: DescriptionArgs): JSX.Element => {
  return (
    <Card
      style={{
        marginTop: '31px',
      }}
    >
      <CardText
        style={{
          textAlign: 'center',
        }}
      >
        <h2>
          {args.repo.split('/')[0]}&apos;s {args.repo.split('/')[1]}
        </h2>
        <h6>
          See the rest here:{' '}
          <Link to={args.repo}>{args.repo.split('/')[1]}</Link>
        </h6>
      </CardText>
      <CardBody>
        <CardText
          style={{
            outline: '0.05rem solid gray',
            padding: '0.25rem',
          }}
        >
          {args.desc}
        </CardText>
        <CardText
          style={{
            textAlign: 'center',
          }}
        >
          <img
            alt="reScribe"
            src={logoBlack}
            style={{
              width: '127px',
              height: '23px',
            }}
          ></img>
        </CardText>
      </CardBody>
    </Card>
  );
};

export default Description;
