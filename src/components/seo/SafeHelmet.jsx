import { Component } from 'react';
import { Helmet } from 'react-helmet';

class SafeHelmet extends Component {
  constructor(props) {
    super(props);
    this.state = { isMounted: false };
  }

  componentDidMount() {
    this.setState({ isMounted: true });
  }

  render() {
    if (!this.state.isMounted && typeof window === 'undefined') {
      return null;
    }

    return <Helmet {...this.props} />;
  }
}

export default SafeHelmet;