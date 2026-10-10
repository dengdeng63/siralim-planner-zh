import React, { Component, PureComponent } from "react";
import _ from "underscore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import icon_attack from "../icons/attack.png";
import icon_health from "../icons/health.png";
import icon_intelligence from "../icons/intelligence.png";
import icon_defense from "../icons/defense.png";
import icon_speed from "../icons/speed.png";

import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { faSortAlphaDown } from "@fortawesome/free-solid-svg-icons";
import { faSortAlphaDownAlt } from "@fortawesome/free-solid-svg-icons";
import { faSortNumericDown } from "@fortawesome/free-solid-svg-icons";
import { faSortNumericDownAlt } from "@fortawesome/free-solid-svg-icons";

import MonsterClassIcon from "./MonsterClassIcon";
import GroupStar from "./GroupStar";
import { getGroups, itemVisible } from "../functions/userData";
import { t, D, getLang } from "../functions/lang";

/** 分组成员唯一键：特性名优先，退回生物名 */
function suTraitKey(m) {
  return (
    (m && (m.trait_name_cn || m.trait_name)) ||
    (m && (m.creature_cn || m.creature)) ||
    ""
  );
}

const metadata = require("../data/metadata");

const MONSTERS_PER_PAGE = 120;

// A single field in the header of the Monster Selection table.
class HeaderField extends PureComponent {
  // For stats, render a stat icon according to their value.
  renderStatIcon(stat) {
    let icon = "";

    if (stat === "stats.health") icon = icon_health;
    if (stat === "stats.attack") icon = icon_attack;
    if (stat === "stats.intelligence") icon = icon_intelligence;
    if (stat === "stats.defense") icon = icon_defense;
    if (stat === "stats.speed") icon = icon_speed;

    return <img src={icon} className="class-icon" alt={"stat-" + stat} />;
  }

  // Render a sort button when sortOrder is not null.
  renderSortButton() {
    let icon = faCaretUp;
    switch (this.props.sortOrder) {
      case "asc":
        icon =
          this.props.type === "numeric"
            ? faSortNumericDownAlt
            : faSortAlphaDownAlt;
        break;
      case "desc":
        icon =
          this.props.type === "numeric" ? faSortNumericDown : faSortAlphaDown;
        break;
      default:
        return "";
    }
    return <FontAwesomeIcon icon={icon} />;
  }

  render() {
    return (
      <div
        className={
          "monster-row-" +
          this.props.class_name +
          (this.props.sortable ? " sortable" : "")
        }
        onClick={() => {
          if (this.props.sortable)
            this.props.updateSortField(this.props.sort_name);
        }}
      >
        {this.props.sort_name.startsWith("stats")
          ? this.renderStatIcon(this.props.sort_name)
          : this.props.field_name}
        {this.props.sortable && (
          <span className="sort-button">{this.renderSortButton()}</span>
        )}
      </div>
    );
  }
}

// The header of the monster table (on the monster selection window).
class MonsterSelectionRowHeader extends PureComponent {
  render() {
    const fields = [
      {
        sort_name: "",
        class_name: "in-party",
        field_name: "",
        not_sortable: true,
      },
      {
        sort_name: "class",
        type: "alpha",
        class_name: "class",
        field_name: t("系别", "Class"),
      },
      {
        sort_name: "family",
        type: "alpha",
        class_name: "family",
        field_name: t("种族", "Family"),
      },
      {
        sort_name: "creature",
        type: "alpha",
        class_name: "creature",
        field_name: t("生物", "Creature"),
      },
      {
        sort_name: "trait_name",
        type: "alpha",
        class_name: "trait_name",
        field_name: t("特性", "Trait"),
      },
      {
        sort_name: "trait_description",
        type: "alpha",
        class_name: "trait_description",
        field_name: t("特性描述", "Trait Description"),
      },
      {
        sort_name: "stats.health",
        type: "numeric",
        class_name: "stat",
        field_name: "H",
      },
      {
        sort_name: "stats.attack",
        type: "numeric",
        class_name: "stat",
        field_name: "A",
      },
      {
        sort_name: "stats.intelligence",
        type: "numeric",
        class_name: "stat",
        field_name: "I",
      },
      {
        sort_name: "stats.defense",
        type: "numeric",
        class_name: "stat",
        field_name: "D",
      },
      {
        sort_name: "stats.speed",
        type: "numeric",
        class_name: "stat",
        field_name: "S",
      },
      {
        sort_name: "material_name",
        type: "alpha",
        class_name: "material_name",
        field_name: t("材料", "Material Name"),
      },
    ];

    return (
      <div
        className={
          "monster-selection-row monster-row-header detailed" +
          (this.props.sortField ? " sorted" : "")
        }
      >
        {fields.map((field, i) => (
          <HeaderField
            key={i}
            sort_name={field.sort_name}
            class_name={field.class_name}
            field_name={field.field_name}
            sortable={!field.not_sortable}
            type={field.type}
            sortOrder={
              field.sort_name === this.props.sortField
                ? this.props.sortOrder
                : null
            }
            updateSortField={this.props.updateSortField}
          />
        ))}
      </div>
    );
  }
}

// A single stat in the MonsterSelection table, colourised based on how high it is with
// respect to the stats of other monsters.
class MonsterStat extends PureComponent {
  // Colour the background according to the stat's value with respect to the stats of
  // the other monsters.
  // This is determined via the metadata.
  getStatBackground() {
    const stat = this.props.stat;
    const value = this.props.value;

    const avgStat = metadata.average_stats[stat.toLowerCase()];
    const minStat = metadata.min_stats[stat.toLowerCase()];
    const maxStat = metadata.max_stats[stat.toLowerCase()];

    let colour = "rgba(0, 0, 0, ";
    let positive = 0;
    if (value > avgStat) positive = 1;
    else if (value < avgStat) positive = -1;

    let opacity = 0;
    if (positive > 0) opacity = (value - avgStat) / (maxStat - avgStat);
    else if (positive < 0) opacity = (avgStat - value) / (avgStat - minStat);

    if (positive > 0) colour = "rgba(0, 235, 16, ";
    else if (positive < 0) colour = "rgba(252, 19, 3, ";
    return { background: colour + opacity * 0.75 + ")" };
  }

  render() {
    return (
      <div className={"monster-row-stat "}>
        <span className="mobile-only ib">
          <b>{this.props.stat}:&nbsp;</b>
        </span>
        <span className="stat-value" style={this.getStatBackground()}>
          {this.props.value || "-"}
        </span>
      </div>
    );
  }
}

// A fragment of all stats of a particular monster in the MonsterSelection table.
class MonsterStats extends PureComponent {
  render() {
    const stats = ["Health", "Attack", "Intelligence", "Defense", "Speed"];
    return (
      <React.Fragment>
        {stats.map((stat, i) => (
          <MonsterStat
            key={i}
            stat={stat}
            value={this.props[stat.toLowerCase()]}
          />
        ))}
      </React.Fragment>
    );
  }
}

class MonsterSelectionRow extends Component {
  // A function for rendering a particular class (cls).
  // It will render an icon if the class is one of the 5 classes in the game,
  // otherwise it will render the full name of the class (e.g. "Rodian Master").
  renderClass(cls, fullName) {
    let c = this.props.class.toLowerCase();
    let iconedClass =
      c === "nature" ||
      c === "chaos" ||
      c === "death" ||
      c === "sorcery" ||
      c === "life";

    return (
      <div className={"cls-container" + (!fullName ? " center" : "")}>
        {iconedClass && <MonsterClassIcon icon={this.props.class} />}
        <span className={"cls-full-name col-cls-" + cls.toLowerCase()}>
          {D(this.props, "class_cn", "class")}
        </span>
      </div>
    );
  }

  render() {
    return (
      <div
        className={
          "monster-selection-row" + (this.props.inParty ? " in-party" : "")
        }
      >
        <div className="monster-row-in-party">
          {this.props.inParty && (
            <span className="green-tick">
              <FontAwesomeIcon icon={faCheck} />
            </span>
          )}
        </div>

        <div className="monster-row-class">
          <span className="mobile-only ib">
            <b>{t("系别", "Class")}:&nbsp;&nbsp;</b>
          </span>
          {this.renderClass(this.props.class, this.props.renderFullRow)}
        </div>
        <div className="monster-row-family">
          <span className="mobile-only ib">
            <b>{t("种族", "Family")}:&nbsp;</b>
          </span>
          <span className="family-icon-box">
            {this.props.familyIcon && (
              <img
                className="family-icon"
                src={this.props.familyIcon}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = spriteUrl(null);
                }}
              />
            )}
          </span>
          {D(this.props, "family_cn", "family")}
        </div>
        <div className="monster-row-creature">
          <span className="mobile-only ib">
            <b>{t("生物", "Creature")}:&nbsp;</b>
          </span>
          {this.props.showSprite && (
            <img
              className="creature-row-sprite"
              src={spriteUrl(this.props.sprite_filename)}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = spriteUrl(null);
              }}
            />
          )}
          {D(this.props, "creature_cn", "creature")}
        </div>
        <div className="monster-row-trait_name">
          <span className="mobile-only ib">
            <b>{t("特性", "Trait name")}:&nbsp;</b>
          </span>
          {D(this.props, "trait_name_cn", "trait_name")}
        </div>
        <div className={"monster-row-trait_description"}>
          <span className="mobile-only ib">
            <b>{t("特性描述", "Trait description")}:&nbsp;</b>
          </span>
          {D(this.props, "trait_description_cn", "trait_description")}
        </div>

        <MonsterStats {...this.props.stats} />

        <div className="monster-row-material_name">
          {D(this.props, "material_cn", "material_name")}
        </div>
      </div>
    );
  }
}

/**
 * A simple function that returns the family of a creature, or the class + ' traits' in the case that
 * the family is not present (as is the case for backer traits).
 * This is used for the page names on the Monster Selection window.
 * @param  {Object} m A monster object, which has a name, family, class etc.
 * @return {String}   The semantic name of the family for the page tab.
 */
function getPageFamily(m) {
  return m.family ? m.family : m.class + " traits"; // Exception for Backer traits
}

function spriteUrl(filename) {
  return process.env.PUBLIC_URL + "/" + (filename || "MISSING.png");
}

// 种族 -> 游戏内种族图标（解包游戏 + wiki 补齐，见 public/race_icons/）。
// race_icons.json 为可用图标的索引（种族英文小写、空格换下划线）；
// 没有专属图标的种族（2026-10 当前 12 个）UI 会显示为 MISSING.png，不再回退到代表生物缩略图。
const _raceIconSet = new Set(require("../data/race_icons.json"));
function raceIconUrl(family) {
  const key = String(family || "").toLowerCase().replace(/ /g, "_");
  if (!_raceIconSet.has(key)) return "";
  return process.env.PUBLIC_URL + "/race_icons/" + key + ".png";
}

/**
 * Get the 'semantic name' of a monster, for the top of the Monster Selection window.
 * i.e. "Abomination / Brute".
 * @param  {Object} m A monster object, which has a name, family, class etc.
 * @return {String}   A string representing the semantic name of the monster.
 */
function getMonsterSemanticName(m) {
  function isCreature(m) {
    return (
      m.class === "Nature" ||
      m.class === "Death" ||
      m.class === "Life" ||
      m.class === "Chaos" ||
      m.class === "Sorcery"
    );
  }

  return (isCreature(m) ? D(m, "creature_cn", "creature") : D(m, "trait_name_cn", "trait_name"));
}

/**
 * The Monster Selection modal, i.e. the window that contains a list of all monsters/traits in
 * Siralim Ultimate.
 * @property {Array} state.filteredItems An array of items from props.items that have been filtered
 *                                       according to the current search term.
 * @property {Array} state.filteredItemGroups An array of item group objects, representing the start and
 *                                      end index of each page.
 * @property {Integer} state.currentPage The index of the current page that the user is on.
 * @property {String} state.currentSearchTerm The current search term, i.e. what is in the search box.
 * @property {String} state.appliedSearchTerm The *applied* search term, which is applied 0.5s after the user finishes
 *                                      typing something into the search box.
 * @property {String} state.sortField The current field to sort by, e.g. "Class".
 * @property {String} state.sortOrder The current sort order, i.e. null, 'asc', 'desc'.
 * @property {Timeout} searchTimeout A timeout that takes place after the user stops typing in the search box.
 * @property {Ref}  tableRef  A reference of the monster table, so that it can be used to scroll back
 *                            to the top when switching between pages.
 */
class MonsterSelectionModal extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      filteredItems: [],
      filteredItemGroups: [{ start: 0, end: 0 }],
      currentPage: 0,
      currentSearchTerm: "",
      appliedSearchTerm: "",
      sortField: null,
      sortOrder: null,
      groupFilter: "", // ""=全部 | "__ungrouped"=未分组 | 分组名
      // 每页条数：50/100/500/1000 或 Infinity（全部），记忆在浏览器
      pageSize: this.loadPageSize(),
      viewMode:
        window.localStorage.getItem("su_selection_view") === "icons"
          ? "icons"
          : window.localStorage.getItem("su_selection_view") === "large"
          ? "large"
          : "detailed",
    };
    this.searchTimeout = null;
    this.tableRef = React.createRef();
  }

  /**
   * When the component is mounted, filter the results and set this.state accordingly.
   */
  componentDidMount() {
    this.filterResults(); // Build this.state.filteredItems
  }

  componentDidUpdate(prevProps) {
    // 外部预置搜索词（如聊天助手要求列出某关键词的全部相关条目）：
    // presetSeq 每次递增确保同一关键词重复打开也能生效
    if (
      this.props.presetSeq &&
      this.props.presetSeq !== prevProps.presetSeq &&
      this.props.presetSearch
    ) {
      this.setState(
        {
          currentSearchTerm: this.props.presetSearch,
          appliedSearchTerm: this.props.presetSearch,
          currentPage: 0,
          sortField: null,
          sortOrder: null,
        },
        () => this.filterResults()
      );
    }
  }

  // 从 localStorage 读取每页条数（默认 120，与原版一致）
  loadPageSize() {
    const v = window.localStorage.getItem("su_selection_pagesize");
    if (v === "all") return Infinity;
    const n = parseInt(v, 10);
    return n > 0 ? n : MONSTERS_PER_PAGE;
  }

  // 切换每页条数并重排分页
  handleChangePageSize(value) {
    const pageSize = value === "all" ? Infinity : parseInt(value, 10);
    window.localStorage.setItem("su_selection_pagesize", value);
    this.setState({ pageSize }, () => this.filterResults());
  }

  /**
   * A terribly written function that basically puts all of the monsters into particular groups.
   * This is for pagination.
   * The result is a list of monster groups, for example:
   * {start: 0, end: 120, familyStart: "Abomination", familyEnd: "Basilisk"} means that
   * monster #0 to monster #120 belong on the first page. The first family is Abomination,
   * and the last family is Basilisk.
   *
   * Rather than using fixed page size (i.e. 100), this function ensures that the families
   * are not split onto separate pages, i.e. there might be 102 on a page so that
   * one of the families is not split onto two separate pages.
   *
   * This function is super awkward and needs rewriting, but it works for now.
   * @param  {Array} items The list of items (i.e. the list of all monsters/traits).
   * @return {Array}       An array of Objects, where each represents the start, end, familyStart and familyEnd,
   *                       for example {0, 50, "Amaranth", "Amphisbeana"}
   */
  getItemGroups(items) {
    let itemGroups = [];
    let currentGroup = {
      start: 0,
      end: null,
      familyStart: null,
      familyEnd: null,
    };
    let monstersInCurrentGroup = [];
    for (let i = 0; i < items.length; i++) {
      let m = items[i];
      //let m = item.monster;
      let f = getPageFamily(m);

      if (!currentGroup.familyStart) currentGroup.familyStart = f;
      monstersInCurrentGroup.push(m);
      if (
        monstersInCurrentGroup.length > this.state.pageSize &&
        f !==
          getPageFamily(
            monstersInCurrentGroup[
              Math.max(0, monstersInCurrentGroup.length - 2)
            ]
          )
      ) {
        currentGroup.end = i;
        currentGroup.familyEnd = getPageFamily(
          monstersInCurrentGroup[Math.max(0, monstersInCurrentGroup.length - 2)]
        );
        itemGroups.push(currentGroup);
        currentGroup = { start: i, end: null, familyStart: f, familyEnd: null };
        monstersInCurrentGroup = [];
      }
    }

    // Catch the last group as well.
    if (monstersInCurrentGroup.length > 0) {
      let i = items.length - 1;

      currentGroup.end = i + 1;
      currentGroup.familyEnd = getPageFamily(
        monstersInCurrentGroup[Math.max(0, monstersInCurrentGroup.length - 1)]
      );

      itemGroups.push(currentGroup);
    }

    return itemGroups;
  }

  /**
   * A function that sets the currentSearchTerm to the value the user has typed in the search box.
   * 0.5s after the user has stopped typing, apply the search term.
   * @param  {Event} e The event that sparked the search change.
   */
  handleSearchChange(e) {
    window.clearTimeout(this.searchTimeout);
    this.setState(
      {
        currentSearchTerm: e.target.value,
      },
      () => {
        this.searchTimeout = window.setTimeout(
          () => this.applySearchTerm(),
          500
        );
      }
    );
  }

  /**
   * Sort the results of filteredItems based on the current sort field and sort order.
   * @param  {Array} filteredItems A list of items that have been filtered.
   * @return {Array}               The sorted filtered items.
   */
  sortResults(filteredItems) {
    const field = this.state.sortField;
    const order = this.state.sortOrder;

    function compare(a, b) {
      const sf = field.split(".");
      let af = _.get(a, sf, -1);
      let bf = _.get(b, sf, -1);
      if (af === "") af = "zzzzzzz"; // For empty strings (backer traits etc), treat them as if they were zzzz, e.g. last
      if (bf === "") bf = "zzzzzzz";

      if (af < bf) return order === "asc" ? 1 : -1;
      if (af > bf) return order === "asc" ? -1 : 1;
      return 0;
    }

    // Sort the filteredItems if sortField is not null
    if (this.state.sortField)
      return filteredItems.sort((a, b) => compare(a, b));
    return filteredItems;
  }

  /**
   * Filter items by applying the current search term to this.props.items.
   * Afterwards, set this.state accordingly and scroll to the top of the table.
   */
  filterResults() {
    let allSearchTerms = this.state.currentSearchTerm.split(/\s+AND\s+/);
    let filteredItems = [];
    const items = this.props.items;

    for (let item of items) {
      let searchText = item.search_text;
      let matchesAllSearchTerms = true;
      for (let searchTerm of allSearchTerms) {
        if (searchText.toLowerCase().indexOf(searchTerm.toLowerCase()) === -1) {
          matchesAllSearchTerms = false;
        }
      }
      if (matchesAllSearchTerms) {
        filteredItems.push(item);
      }
    }

    // 分组过滤（收藏夹）
    const suGroups = getGroups("trait");
    if (this.state.groupFilter) {
      filteredItems = filteredItems.filter((m) =>
        itemVisible(suGroups, this.state.groupFilter, suTraitKey(m))
      );
    }

    const sortedFilteredItems = this.sortResults(filteredItems);
    const filteredItemGroups = this.getItemGroups(sortedFilteredItems);

    this.setState(
      {
        currentPage: 0,
        filteredItems: sortedFilteredItems,
        filteredItemGroups: filteredItemGroups,
      },
      () => {
        this.tableRef.current.scrollTo(0, 0);
      }
    ); // Scroll to top of table once complete.
  }

  /**
   * Apply the search term and filter the results accordingly.
   */
  applySearchTerm() {
    this.setState(
      {
        appliedSearchTerm: this.state.currentSearchTerm,
      },
      () => this.filterResults()
    );
  }

  /**
   * A function to render the results count.
   * The output depends on whether *all* results are being shown,
   * or a filtered list.
   * @return {ReactComponent} A span that contains a count of the search results.
   */
  renderResultsCount() {
    let r = (
      <span>
        <b>{this.state.filteredItems.length}</b>
        {t(" / ", " of ")}
        <b>{this.props.items.length}</b>
        {t(" 个结果", " results")}
      </span>
    );
    if (this.state.filteredItems.length === this.props.items.length) {
      r = (
        <span>
          {t("全部 ", "all ")}
          <b>{this.props.items.length}</b>
          {t(" 个结果", " results")}
        </span>
      );
    }
    let f = "";
    if (this.state.appliedSearchTerm) {
      f = t("（符合当前搜索词）", " matching the current search term");
    }

    return (
      <span>
        {t("显示 ", "Displaying ")}
        {r}
        {f}
        {t("。", ".")}
      </span>
    );
  }

  /**
   * Go to a particular page, i.e. set currentPage = pageNum.
   * Scroll to top of table once complete.
   * @param  {Integer} pageNum The index of the page to go to.
   */
  goToPage(pageNum) {
    this.setState(
      {
        currentPage: pageNum,
      },
      () => {
        this.tableRef.current.scrollTo(0, 0);
      }
    );
  }

  /**
   * Switch between the "detailed" table view and the "icons" thumbnail grid view.
   * The choice is persisted in localStorage.
   */
  setViewMode(mode) {
    this.setState({ viewMode: mode }, () => {
      window.localStorage.setItem("su_selection_view", mode);
      if (this.tableRef.current) this.tableRef.current.scrollTo(0, 0);
    });
  }

  /**
   * Render one creature card for the "icons" view.
   */
  renderIconCard(monsterRow, i) {
    const name =
      D(monsterRow, "creature_cn", "creature") ||
      D(monsterRow, "trait_name_cn", "trait_name") ||
      D(monsterRow, "class_cn", "class");
    const family = D(monsterRow, "family_cn", "family") || "";
    const trait = D(monsterRow, "trait_name_cn", "trait_name") || "";
    const desc = D(monsterRow, "trait_description_cn", "trait_description") || "";
    const isSelected =
      monsterRow &&
      this.props.currentSelectedMonster &&
      monsterRow.uid === this.props.currentSelectedMonster.uid;
    return (
      <div
        className={
          "monster-icon-card selectable" +
          (isSelected ? " currently-selected-monster" : "") +
          (this.props.monstersInParty.has(monsterRow.uid) ? " in-party" : "")
        }
        key={i}
        title={name + (family ? "\n" + t("种族", "Family") + "：" + family : "") + (trait ? "\n" + t("特性", "Trait") + "：" + trait : "") + (desc ? "\n" + desc : "")}
        onMouseUp={() => this.props.updatePartyMember(monsterRow)}
      >
        <img
          className="monster-icon-img"
          src={spriteUrl(monsterRow.sprite_filename)}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = spriteUrl(null);
          }}
        />
        <div className="monster-icon-name">{name}</div>
        {family && <div className="monster-icon-family">{family}</div>}
      </div>
    );
  }

  updateSortField(sortField) {
    this.setState(
      {
        sortField:
          sortField === this.state.sortField && this.state.sortOrder === "asc"
            ? null
            : sortField,
        sortOrder:
          this.state.sortField === sortField
            ? this.state.sortOrder === "desc"
              ? "asc"
              : this.state.sortOrder === "asc"
              ? null
              : "desc"
            : "desc",
      },
      () => this.filterResults()
    );
  }

  /**
   * Render the name of a page given the index of the page and the itemGroup.
   * @param  {Integer} i         The page number.
   * @param  {Object} itemGroup A single itemGroup.
   * @return {String}           The page name, e.g. "Amaranth - Amphisbeana" or "31 - 36".
   */
  renderPageName(i, itemGroup) {
    let pageStart = "";
    let pageEnd = "";

    let sf = this.state.sortField ? this.state.sortField.split(".") : "family";
    if (!this.state.filteredItems[this.state.filteredItemGroups[i].start])
      pageStart = "(unknown)";
    else {
      pageStart = String(
        _.get(
          this.state.filteredItems[this.state.filteredItemGroups[i].start],
          sf,
          "(empty)"
        )
      );
      if (pageStart.length > 8) pageStart = pageStart.slice(0, 7) + "...";
    }

    if (!this.state.filteredItems[this.state.filteredItemGroups[i].end - 1])
      pageEnd = "(unknown)";
    else {
      pageEnd = String(
        _.get(
          this.state.filteredItems[this.state.filteredItemGroups[i].end - 1],
          sf,
          "(empty)"
        )
      );
      if (pageEnd.length > 8) pageEnd = pageEnd.slice(0, 7) + "...";
    }

    return pageStart + " - " + pageEnd;
  }

  /**
   * The render function
   * @return {ReactComponent} The modal content div.
   */
  render() {
    // Get the start and end index via this.state.filteredItemGroups.
    let startIndex = this.state.filteredItemGroups[this.state.currentPage]
      ? this.state.filteredItemGroups[this.state.currentPage].start
      : 0;
    let endIndex = this.state.filteredItemGroups[this.state.currentPage]
      ? this.state.filteredItemGroups[this.state.currentPage].end
      : 0;

    let slot =
      this.props.currentTraitSlotId === 0
        ? "primary"
        : this.props.currentTraitSlotId === 2
        ? "secondary"
        : "artifact";
    let slot_n = slot === "artifact" ? "n" : "";
    let currentMonster = !_.isEmpty(this.props.currentSelectedMonster)
      ? getMonsterSemanticName(this.props.currentSelectedMonster)
      : null;

    return (
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            {t(
              `为队伍成员 ${this.props.currentPartyMemberId + 1} 选择${
                slot === "primary" ? "本身特性" : slot === "secondary" ? "融合特性" : "部件特性"
              }。`,
              `Select a${slot_n} ${slot} trait for party member ${this.props.currentPartyMemberId + 1}.`
            )}{" "}
            <span style={{ marginLeft: "20px" }}>
              {currentMonster && t("当前：", "Current: ") + currentMonster}
            </span>
          </h3>
          <button
            id="close-modal"
            className="modal-close"
            aria-label="Close trait selection"
            onClick={this.props.closeModal}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="monster-selection-modal">
          <div className="monster-selection-controls">
            <div className="monster-selection-search-tools">
              <input
                id="monster-search"
                className="monster-search"
                autoFocus
                type="text"
                placeholder={t(
                  "搜索生物 / 特性…（多个条件用 AND 连接，例如：弱点 AND 挑衅）",
                  "Search monsters/traits...                 (type 'AND' between terms to search for multiple things e.g. 'defend AND provoke'"
                )}
                onChange={(e) => this.handleSearchChange(e)}
                value={this.state.currentSearchTerm}
              />
              <div className="selection-view-toggle">
                <button
                  type="button"
                  className={
                    "view-btn" +
                    (this.state.viewMode === "detailed" ? " active" : "")
                  }
                  onClick={() => this.setViewMode("detailed")}
                >
                  {t("详细信息", "Detailed")}
                </button>
                <button
                  type="button"
                  className={
                    "view-btn" +
                    (this.state.viewMode === "icons" ? " active" : "")
                  }
                  onClick={() => this.setViewMode("icons")}
                >
                  {t("图标", "Icons")}
                </button>
                <button
                  type="button"
                  className={
                    "view-btn" +
                    (this.state.viewMode === "large" ? " active" : "")
                  }
                  onClick={() => this.setViewMode("large")}
                >
                  {t("大视图", "Large")}
                </button>
              </div>
              <div className="page-size-select">
                <label>{t("分组", "Group")}</label>
                <select
                  value={this.state.groupFilter}
                  onChange={(e) =>
                    this.setState(
                      { groupFilter: e.target.value },
                      () => this.filterResults()
                    )
                  }
                >
                  <option value="">{t("全部", "All")}</option>
                  <option value="__ungrouped">{t("未分组", "Ungrouped")}</option>
                  {getGroups("trait").map((g) => (
                    <option key={g.name} value={g.name}>
                      ★ {g.name}（{g.items.length}）
                    </option>
                  ))}
                </select>
              </div>
              <div className="page-size-select">
                <label>{t("每页", "Per page")}</label>
                <select
                  value={
                    this.state.pageSize === Infinity
                      ? "all"
                      : String(this.state.pageSize)
                  }
                  onChange={(e) => this.handleChangePageSize(e.target.value)}
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                  <option value="all">{t("全部", "All")}</option>
                </select>
              </div>
            </div>
            <div className="monster-selection-pagination">
              {this.state.filteredItemGroups.map((itemGroup, i) => (
                <div
                  role="button"
                  key={i}
                  onClick={() => this.goToPage(i)}
                  className={
                    "tab" + (this.state.currentPage === i ? " active" : "")
                  }
                >
                  {this.renderPageName(i, itemGroup)}
                </div>
              ))}
            </div>
          </div>

          <div
            className={
              "monster-selection-table" +
              (this.state.viewMode === "icons"
                ? " monster-icon-grid"
                : this.state.viewMode === "large"
                ? " monster-list monster-list-large"
                : " monster-list")
            }
            ref={this.tableRef}
          >
            {this.state.viewMode === "icons" ? (
              this.state.filteredItems
                .slice(startIndex, endIndex)
                .map((monsterRow, i) =>
                  this.renderIconCard(monsterRow, i)
                )
            ) : (
              <React.Fragment>
                <div className="mobile-hidden monster-row-container monster-row-container-selection monster-row-container-header">
                  <MonsterSelectionRowHeader
                    sortField={this.state.sortField}
                    sortOrder={this.state.sortOrder}
                    updateSortField={this.updateSortField.bind(this)}
                  />
                </div>
                {this.state.filteredItems
                  .slice(startIndex, endIndex)
                  .map((monsterRow, i) => (
                    <div
                      className={
                        "monster-row-container monster-row-container-selection selectable" +
                        (monsterRow &&
                        this.props.currentSelectedMonster &&
                        monsterRow.uid === this.props.currentSelectedMonster.uid
                          ? " currently-selected-monster"
                          : "")
                      }
                      key={i}
                      onMouseUp={() => this.props.updatePartyMember(monsterRow)}
                    >
                      <MonsterSelectionRow
                        {...monsterRow}
                        renderFullRow={true}
                        searchTerm={this.state.currentSearchTerm}
                        familyIcon={raceIconUrl(monsterRow.family)}
                        showSprite={this.state.viewMode === "large"}
                        inParty={this.props.monstersInParty.has(monsterRow.uid)}
                      />
                      <GroupStar
                        type="trait"
                        item={suTraitKey(monsterRow)}
                        onChange={() => this.filterResults()}
                      />
                    </div>
                  ))}
              </React.Fragment>
            )}
          </div>
          <div className="monster-selection-results-count">
            {this.renderResultsCount()}
          </div>
        </div>
      </div>
    );
  }
}

export default MonsterSelectionModal;
