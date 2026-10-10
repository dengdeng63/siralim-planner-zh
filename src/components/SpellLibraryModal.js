import React, { Component } from "react";
import { t } from "../functions/lang";
import "../scss/SpellLibraryModal.scss";

import spellsData from "../data/spells.json";

import icon_sorcery from "../icons/sorcery.png";
import icon_death from "../icons/death.png";
import icon_chaos from "../icons/chaos.png";
import icon_life from "../icons/life.png";
import icon_nature from "../icons/nature.png";

import GroupStar from "./GroupStar";
import { getGroups, itemVisible } from "../functions/userData";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/** 系别中文名 -> 图标（来自原版 planner 的 src/icons） */
const CLASS_ICONS = {
  巫术: icon_sorcery,
  死亡: icon_death,
  混沌: icon_chaos,
  生命: icon_life,
  自然: icon_nature,
};

/**
 * 法术库：浏览全部法术（搜索 + 系别筛选 + 分组 + 排序 + 分页）。
 * pickMode=true 时为"点选模式"：点击一行把该法术交给 onSelectSpell（法术槽填入）。
 */
class SpellLibraryModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: props.initialSearch || "",
      appliedSearchTerm: props.initialSearch || "",
      classFilter: "",
      groupFilter: "", // ""=全部 | "__ungrouped"=未分组 | 分组名
      sortBy: null, // null=默认顺序 | "name" | "class" | "charges"
      sortDir: 1, // 1=升序 -1=降序
      page: 0,
      pageSize: 50,
      hoverImg: null,
      hoverTimer: null,
    };
    this.classes = Array.from(
      new Set(spellsData.map((s) => s.class_cn).filter(Boolean))
    ).sort();
  }

  componentWillUnmount() {
    if (this.state.hoverTimer) clearTimeout(this.state.hoverTimer);
  }

  componentDidUpdate(prevProps) {
    // 每次打开弹窗且带预置搜索词时（如问答助手自动打开法术库），同步搜索状态
    if (this.props.modalIsOpen && !prevProps.modalIsOpen) {
      const s = (this.props.initialSearch || "").trim();
      if (s && s !== this.state.appliedSearchTerm) {
        this.setState({
          searchTerm: s,
          appliedSearchTerm: s,
          page: 0,
        });
      }
    }
  }

  /** 点击表头切换排序：同列再点反转方向，不同列默认升序 */
  toggleSort = (key) => {
    this.setState((st) => ({
      sortBy: key,
      sortDir: st.sortBy === key ? -st.sortDir : 1,
      page: 0,
    }));
  };

  sortIndicator = (key) => {
    if (this.state.sortBy !== key) return "";
    return this.state.sortDir === 1 ? " ▲" : " ▼";
  };

  filtered() {
    const term = this.state.appliedSearchTerm.trim().toLowerCase();
    let list = spellsData;
    if (this.state.classFilter) {
      list = list.filter((s) => s.class_cn === this.state.classFilter);
    }
    if (term) {
      const terms = term.split(/\s+AND\s+|\s+/).filter(Boolean);
      list = list.filter((s) => terms.every((x) => s.search_text.indexOf(x) !== -1));
    }
    // 分组过滤（收藏夹）
    const groups = getGroups("spell");
    if (this.state.groupFilter) {
      list = list.filter((s) => itemVisible(groups, this.state.groupFilter, s.name_cn));
    }
    // 排序：系别按固定顺序，充能按数值，法术名按中文
    const { sortBy, sortDir } = this.state;
    if (sortBy === "name") {
      const d = [...list];
      d.sort((a, b) => sortDir * String(a.name_cn).localeCompare(String(b.name_cn), "zh"));
      list = d;
    } else if (sortBy === "class") {
      const order = ["自然", "生命", "混沌", "死亡", "巫术"];
      const idx = (c) => {
        const i = order.indexOf(c);
        return i === -1 ? 99 : i;
      };
      const d = [...list];
      d.sort((a, b) => sortDir * (idx(a.class_cn) - idx(b.class_cn)));
      list = d;
    } else if (sortBy === "charges") {
      const num = (v) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
      };
      const d = [...list];
      d.sort((a, b) => sortDir * (num(a.charges) - num(b.charges)));
      list = d;
    }
    return list;
  }

  applySearch = () => {
    this.setState({
      appliedSearchTerm: this.state.searchTerm,
      page: 0,
    });
  };

  handleKey = (e) => {
    if (e.key === "Enter") this.applySearch();
  };

  refreshGroups = () => {
    this.forceUpdate(); // 分组变化后重算过滤（filtered() 每次现读）
  };

  /** 点选模式：把法术交给父组件（法术槽填入） */
  handlePick = (spell) => {
    if (this.props.pickMode && typeof this.props.onSelectSpell === "function") {
      this.props.onSelectSpell(spell);
    }
  };

  showPreview = (spell) => (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const src =
      API_BASE +
      "/api/entry_image?kind=spell&name=" +
      encodeURIComponent(spell.name_cn);
    const timer = setTimeout(
      () =>
        this.setState({
          hoverImg: {
            src,
            left: Math.min(
              rect.left + rect.width / 2,
              window.innerWidth - 260
            ),
            top: rect.top,
            below: rect.top < window.innerHeight * 0.55,
          },
        }),
      250
    );
    this.setState({ hoverTimer: timer });
  };

  hidePreview = () => {
    if (this.state.hoverTimer) clearTimeout(this.state.hoverTimer);
    this.setState({ hoverImg: null, hoverTimer: null });
  };

  render() {
    const { modalIsOpen, closeModal, pickMode } = this.props;
    if (!modalIsOpen) return null;
    const list = this.filtered();
    const pageSize = this.state.pageSize;
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    const page = Math.min(this.state.page, pages - 1);
    const slice = list.slice(page * pageSize, (page + 1) * pageSize);
    const groups = getGroups("spell");
    return (
      <div className="spell-lib-overlay">
        <div className="spell-lib-modal">
          <div className="spell-lib-header">
            <h2>{pickMode ? t("选择法术", "Pick a Spell") : t("法术库", "Spell Library")}</h2>
            <span className="spell-lib-count">
              {t(
                `共 ${list.length} 个法术（总计 ${spellsData.length}）`,
                `${list.length} of ${spellsData.length} spells`
              )}
            </span>
            <button className="spell-lib-close" onClick={closeModal}>
              ✕
            </button>
          </div>
          {pickMode && (
            <div className="spell-lib-pickbar">
              {this.props.pickLabel ||
                t(
                  "点击法术行即填入槽位；可连续选择，完成后点右上角 ✕ 关闭。",
                  "Click a spell row to fill the slot. Pick multiple, close when done."
                )}
            </div>
          )}
          <div className="spell-lib-toolbar">
            <input
              className="spell-lib-search"
              type="text"
              placeholder={t(
                "搜索法术名 / 效果 / 获取方式（多词用空格分隔）",
                "Search name / effect / source"
              )}
              value={this.state.searchTerm}
              onChange={(e) => this.setState({ searchTerm: e.target.value })}
              onKeyDown={this.handleKey}
            />
            <button className="spell-lib-go" onClick={this.applySearch}>
              {t("搜索", "Search")}
            </button>
            <select
              className="spell-lib-class"
              value={this.state.classFilter}
              onChange={(e) =>
                this.setState({ classFilter: e.target.value, page: 0 })
              }
            >
              <option value="">{t("全部系别", "All classes")}</option>
              {this.classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="spell-lib-class spell-lib-group"
              value={this.state.groupFilter}
              onChange={(e) =>
                this.setState({ groupFilter: e.target.value, page: 0 })
              }
            >
              <option value="">{t("全部分组", "All groups")}</option>
              <option value="__ungrouped">{t("未分组", "Ungrouped")}</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  ★ {g.name}（{g.items.length}）
                </option>
              ))}
            </select>
          </div>
          <div className="spell-lib-list">
            <table>
              <thead>
                <tr>
                  <th
                    className="spell-lib-sortable"
                    style={{ width: "22%" }}
                    onClick={() => this.toggleSort("name")}
                  >
                    {t("法术", "Spell")}
                    {this.sortIndicator("name")}
                  </th>
                  <th
                    className="spell-lib-sortable"
                    style={{ width: "9%" }}
                    onClick={() => this.toggleSort("class")}
                  >
                    {t("系别", "Class")}
                    {this.sortIndicator("class")}
                  </th>
                  <th
                    className="spell-lib-sortable"
                    style={{ width: "6%" }}
                    onClick={() => this.toggleSort("charges")}
                  >
                    {t("充能", "Charges")}
                    {this.sortIndicator("charges")}
                  </th>
                  <th>{t("效果", "Effect")}</th>
                  <th style={{ width: "16%" }}>{t("获取", "Source")}</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s, i) => (
                  <tr
                    key={i}
                    className={pickMode ? "spell-lib-pickable" : ""}
                    onMouseEnter={this.showPreview(s)}
                    onMouseLeave={this.hidePreview}
                    onClick={() => this.handlePick(s)}
                  >
                    <td>
                      <b>{s.name_cn}</b>
                      {s.name_en && (
                        <span className="spell-lib-en"> {s.name_en}</span>
                      )}
                      <GroupStar
                        type="spell"
                        item={s.name_cn}
                        onChange={this.refreshGroups}
                      />
                    </td>
                    <td>
                      {CLASS_ICONS[s.class_cn] && (
                        <img
                          className="spell-lib-class-icon"
                          src={CLASS_ICONS[s.class_cn]}
                          alt=""
                        />
                      )}
                      {s.class_cn}
                    </td>
                    <td>{s.charges}</td>
                    <td>{s.effect_cn}</td>
                    <td className="spell-lib-src">{s.source_cn}</td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan="5" className="spell-lib-empty">
                      {t("没有符合条件的法术", "No matching spells")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="spell-lib-pager">
            <button
              disabled={page === 0}
              onClick={() => this.setState({ page: page - 1 })}
            >
              ‹ {t("上一页", "Prev")}
            </button>
            <span>
              {page + 1} / {pages}
            </span>
            <button
              disabled={page >= pages - 1}
              onClick={() => this.setState({ page: page + 1 })}
            >
              {t("下一页", "Next")} ›
            </button>
          </div>
          {this.state.hoverImg && (
            <div
              className="spell-hover-preview"
              style={{
                left: this.state.hoverImg.left,
                top: this.state.hoverImg.top,
              }}
            >
              <img src={this.state.hoverImg.src} alt="" />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default SpellLibraryModal;
