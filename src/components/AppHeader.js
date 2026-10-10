import React, { PureComponent } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faInfoCircle,
  faTimes,
  faDice,
  faBookOpen,
  faBars,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { t, getLang, setLang } from "../functions/lang";

class AppHeader extends PureComponent {
  state = { menuOpen: false };

  // 点菜单里的任意按钮后自动收起菜单
  onMenuClick = (e) => {
    if (e.target.closest && e.target.closest("button")) {
      this.setState({ menuOpen: false });
    }
  };

  render() {
    return (
      <header className="app-header">
        <div className="container">
          <div className="app-header-left">
            <h3>
              Siralim Planner{" "}
              <span
                className="version-num"
                onClick={this.props.openChangelogModal}
              >
                v{`${process.env.REACT_APP_VERSION}`}
              </span>
              {getLang() === "cn" && (
                <span className="version-num" style={{ marginLeft: "8px" }}>
                  中文版
                </span>
              )}
            </h3>
          </div>
          <div className="app-header-right">
            <button
              id="header-menu-toggle"
              className="lighter app-header-menu-toggle"
              title={t("菜单", "Menu")}
              onClick={() => this.setState((s) => ({ menuOpen: !s.menuOpen }))}
            >
              <FontAwesomeIcon icon={faBars} />
              <span>{t("菜单", "Menu")}</span>
            </button>
            <div
              className={"app-header-menu" + (this.state.menuOpen ? " open" : "")}
              onClick={this.onMenuClick}
            >
              <p>
                <a
                  href="https://docs.google.com/spreadsheets/d/1qvWwf1fNB5jN8bJ8dFGAVzC7scgDCoBO-hglwjTT4iY/edit#gid=0"
                  target="_blank"
                  rel="noreferrer"
                >
                  Compendium
                </a>{" "}
                {this.props.compendiumVersion}
              </p>
              <button
                id="open-spell-library"
                className="lighter"
                title={t("浏览全部法术", "Browse all spells")}
                onClick={this.props.openSpellLibrary}
              >
                <FontAwesomeIcon icon={faBookOpen} />
                <span>{t("法术库", "Spells")}</span>
              </button>
              <button
                id="open-save-panel"
                className="lighter"
                title={t("保存/读取搭配，跨设备同步", "Save/load builds, sync across devices")}
                onClick={this.props.openSavePanel}
              >
                <FontAwesomeIcon icon={faSave} />
                <span>{t("存档", "Builds")}</span>
              </button>
              <button
                id="upload-build"
                className="lighter"
                onClick={this.props.openUploadBuildModal}
              >
                <FontAwesomeIcon icon={faUpload} />
                <span>{t("上传队伍", "Upload party")}</span>
              </button>
              <button
                id="reset-build"
                className="lighter"
                onClick={this.props.resetBuild}
              >
                <FontAwesomeIcon icon={faTimes} />
                <span>{t("重置", "Reset")}</span>
              </button>
              <button
                id="random-build"
                className="lighter"
                onClick={this.props.randomiseBuild}
              >
                <FontAwesomeIcon icon={faDice} />
                <span>{t("随机", "Randomise")}</span>
              </button>
              <button
                id="toggle-lang"
                className="lighter"
                title={t("切换为英文界面", "切换为中文界面")}
                onClick={() => {
                  setLang(getLang() === "cn" ? "en" : "cn");
                }}
              >
                <span>{getLang() === "cn" ? "EN" : "中文"}</span>
              </button>
              <button
                id="open-info-modal"
                className="lighter"
                onClick={this.props.openInfoModal}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>{t("关于", "Info")}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }
}

export default AppHeader;
