import React, { Component } from "react";
import { BrowserRouter } from "react-router-dom";

import SiralimPlanner from "./SiralimPlanner";
import { getLang } from "./functions/lang";

class App extends Component {
  constructor(props) {
    super(props);
    // lang 变化时通过 key 强制整树重渲染，所有组件重读当前语言
    this.state = { langKey: 0 };
  }

  componentDidMount() {
    window.addEventListener("su-lang-change", this.handleLangChange);
  }

  componentWillUnmount() {
    window.removeEventListener("su-lang-change", this.handleLangChange);
  }

  handleLangChange = () => {
    this.setState((s) => ({ langKey: s.langKey + 1 }));
  };

  render() {
    return (
      <BrowserRouter>
        <div key={this.state.langKey}>
          <SiralimPlanner />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
