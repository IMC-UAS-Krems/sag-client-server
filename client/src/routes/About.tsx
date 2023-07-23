import { Component } from "solid-js";
import { translate } from '../i18nConfig'

const About: Component = () => {
  return <div>{translate('About') + ' ' + translate('page')}</div>;
};

export default About;