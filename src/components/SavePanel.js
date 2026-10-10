import React, { PureComponent } from "react";
import { t } from "../functions/lang";
import {
  getBuilds,
  saveBuild,
  deleteBuild,
} from "../functions/userData";
import "./SavePanel.scss";

/**
 * 存档面板（纯本地）：保存/读取/删除 build 搭配。
 * 存档本体是完整的 URL query（?b=...&s=..&a=..&r=..&sp=..），
 * 读取即整页跳转，复用 initialLoad 的全部解析逻辑。
 * 数据存在浏览器 localStorage，不依赖任何后端。
 */
export default class SavePanel extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      builds: getBuilds(),
      newName: "",
      status: "",
    };
  }

  handleSave = () => {
    const name = this.state.newName.trim();
    if (!name) {
      this.setState({ status: t("请先给这套搭配起个名字", "Name this build first") });
      return;
    }
    const query = window.location.search || "?b=_";
    this.setState({
      builds: saveBuild(name, query),
      newName: "",
      status: t("已保存 ✅", "Saved ✅"),
    });
  };

  handleLoad = (b) => {
    window.location.search = b.query;
  };

  handleDelete = (b) => {
    if (!window.confirm(t("删除存档「", "Delete build \"") + b.name + t("」？", "\"?"))) return;
    this.setState({ builds: deleteBuild(b.name) });
  };

  fmtTime = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  render() {
    if (!this.props.modalIsOpen) return null;
    const { closeModal } = this.props;
    return (
      <div className="save-panel-overlay" onClick={closeModal}>
        <div className="save-panel" onClick={(e) => e.stopPropagation()}>
          <div className="save-panel-header">
            <h2>{t("存档", "Builds")}</h2>
            <button className="save-panel-close" onClick={closeModal}>
              ✕
            </button>
          </div>

          <div className="save-panel-new">
            <input
              type="text"
              placeholder={t("给当前搭配起个名字，如：燃烧毒队", "Name this build, e.g. Burn poison team")}
              value={this.state.newName}
              onChange={(e) => this.setState({ newName: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && this.handleSave()}
            />
            <button className="save-panel-save" onClick={this.handleSave}>
              {t("保存当前搭配", "Save current build")}
            </button>
          </div>

          {this.state.status && (
            <div className="save-panel-status">{this.state.status}</div>
          )}

          <p className="save-panel-hint">
            {t(
              "存档保存在本机浏览器中，换设备或清除浏览器数据会丢失。",
              "Builds are stored in this browser. They are lost if you switch devices or clear browser data."
            )}
          </p>

          <div className="save-panel-list">
            {this.state.builds.length === 0 && (
              <div className="save-panel-empty">
                {t("还没有存档。配置好队伍后，起个名字保存吧。", "No builds yet. Configure a party and save it.")}
              </div>
            )}
            {this.state.builds.map((b) => (
              <div className="save-panel-item" key={b.name}>
                <div className="save-panel-item-info">
                  <b>{b.name}</b>
                  <span>{this.fmtTime(b.ts)}</span>
                </div>
                <div className="save-panel-item-actions">
                  <button className="load" onClick={() => this.handleLoad(b)}>
                    {t("读取", "Load")}
                  </button>
                  <button className="del" onClick={() => this.handleDelete(b)}>
                    {t("删除", "Delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
