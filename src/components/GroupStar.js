import React, { PureComponent } from "react";
import {
  getGroups,
  createGroup,
  deleteGroup,
  toggleGroupItem,
  groupsOfItem,
} from "../functions/userData";
import { t } from "../functions/lang";
import "./GroupStar.scss";

/**
 * 行内收藏星标：点击弹出分组勾选小弹层（可新建/删除分组）。
 * @property {String} type  "trait" | "spell"
 * @property {String} item  分组成员唯一键（特性名 / 法术名）
 * @property {Function} onChange 分组数据变化后回调（父组件刷新过滤）
 */
export default class GroupStar extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { open: false, newGroup: "" };
    this.wrapRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleOutside);
  }

  handleOutside = (e) => {
    if (this.wrapRef.current && !this.wrapRef.current.contains(e.target)) {
      this.setState({ open: false });
    }
  };

  toggleOpen = (e) => {
    e.stopPropagation();
    this.setState((st) => ({ open: !st.open, newGroup: "" }));
  };

  inGroups = () => groupsOfItem(this.props.type, this.props.item);

  toggle = (name) => {
    toggleGroupItem(this.props.type, name, this.props.item);
    this.forceUpdate();
    if (this.props.onChange) this.props.onChange();
  };

  create = () => {
    const name = this.state.newGroup.trim();
    if (!name) return;
    createGroup(this.props.type, name);
    if (this.inGroups().indexOf(name) < 0) this.toggle(name);
    else this.forceUpdate();
    if (this.props.onChange) this.props.onChange();
    this.setState({ newGroup: "" });
  };

  removeGroup = (name) => {
    deleteGroup(this.props.type, name);
    this.forceUpdate();
    if (this.props.onChange) this.props.onChange();
  };

  render() {
    const groups = getGroups(this.props.type);
    const mine = this.inGroups();
    const active = mine.length > 0;
    return (
      <span className="group-star-wrap" ref={this.wrapRef}>
        <button
          className={"group-star-btn" + (active ? " active" : "")}
          title={t("加入/移出分组", "Toggle group")}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
          onClick={this.toggleOpen}
        >
          {active ? "★" : "☆"}
        </button>
        {this.state.open && (
          <div
            className="group-star-pop"
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {groups.length === 0 && (
              <div className="group-star-empty">
                {t("还没有分组，先新建一个", "No groups yet")}
              </div>
            )}
            {groups.map((g) => (
              <div className="group-star-row" key={g.name}>
                <label>
                  <input
                    type="checkbox"
                    checked={mine.indexOf(g.name) >= 0}
                    onChange={() => this.toggle(g.name)}
                  />
                  {g.name}
                  <span className="group-star-count">({g.items.length})</span>
                </label>
                <button
                  className="group-star-del"
                  title={t("删除该分组", "Delete group")}
                  onClick={() => {
                    if (window.confirm(t("删除分组「", "Delete group \"") + g.name + t("」？", "\"?")))
                      this.removeGroup(g.name);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="group-star-new">
              <input
                type="text"
                placeholder={t("新分组名", "New group name")}
                value={this.state.newGroup}
                onChange={(e) => this.setState({ newGroup: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") this.create();
                  e.stopPropagation();
                }}
              />
              <button onClick={this.create}>
                {t("新建", "Create")}
              </button>
            </div>
          </div>
        )}
      </span>
    );
  }
}
