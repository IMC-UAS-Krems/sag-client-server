import { Component } from "solid-js";
import { translate } from '../i18nConfig'

const Home: Component = () => {
  return <div>{translate('Home') + ' ' + translate('page')}</div>;
};

export default Home;