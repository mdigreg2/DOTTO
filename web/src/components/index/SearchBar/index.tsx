import React from 'react';
import PropTypes from 'prop-types';
import './style.scss';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FormGroup, Input, FormFeedback, Button } from 'reactstrap';
import BeatLoader from 'react-spinners/BeatLoader';
import { css } from '@emotion/core';
import { navigate } from '@reach/router';

const loaderCSS = css`
  display: block;
  margin: 0 auto;
  border-color: red;
`;

export default function SearchBar() {
  return (
    <Formik
      initialValues={{
        query: '',
      }}
      validationSchema={yup.object({
        query: yup.string().required('required'),
      })}
      onSubmit={async (formData, { setSubmitting, setStatus }) => {
        setSubmitting(true);
        const onError = (): void => {
          setStatus({ success: false });
          setSubmitting(false);
        };
        try {
          console.log(formData);
          navigate(`/search?query=${formData.query}`);
        } catch (err) {
          toast(err.message, {
            type: 'error',
          });
          onError();
        }
      }}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting,
      }) => (
        <>
          <Form className="search-bar-wrapper">
            <FormGroup>
              <Input
                className="search-text-field"
                id="query"
                name="query"
                type="text"
                placeholder="search term"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.query}
                invalid={!!(touched.query && errors.query)}
                disabled={isSubmitting}
              />
              <FormFeedback
                style={{
                  marginBottom: '1rem',
                }}
                className="feedback"
                type="invalid"
              >
                {touched.query && errors.query ? errors.query : ''}
              </FormFeedback>
            </FormGroup>
            <Button
              className="search-button"
              type="submit"
              onClick={(evt: React.MouseEvent) => {
                evt.preventDefault();
                handleSubmit();
              }}
            >
              Go
            </Button>
            <BeatLoader
              css={loaderCSS}
              size={10}
              color={'red'}
              loading={isSubmitting}
            />
          </Form>
        </>
      )}
    </Formik>
  );
}

SearchBar.propTypes = {
  // callback: PropTypes.func.isRequired,
  id: PropTypes.string,
  placeholder: PropTypes.string,
};