/**
 * userData.js — planner 本地数据工具
 *
 * 数据存在浏览器 localStorage（纯前端，不依赖任何后端）：
 *  1. localStorage（换设备/清缓存会丢）
 *  2. 内存缓存（避免重复读写）
 *
 * 数据 blob 结构：{
 *   builds:      [{name, ts, query}]          存档（URL query 串）
 *   traitGroups: [{name, items:[特性名]}]      特性分组
 *   spellGroups: [{name, items:[法术名]}]      法术分组
 * }
 */

export const USER_ID_KEY = "su_user_id";

export function getUserId() {
  try {
    return window.localStorage.getItem(USER_ID_KEY) || "";
  } catch (err) {
    return "";
  }
}

export function setUserId(id) {
  try {
    if (id) window.localStorage.setItem(USER_ID_KEY, id);
    else window.localStorage.removeItem(USER_ID_KEY);
  } catch (err) {}
}

/** ---------- localStorage 层 ---------- */

const KEYS = {
  builds: "su_builds",
  traitGroups: "su_trait_groups",
  spellGroups: "su_spell_groups",
};

export function lsGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {}
}

export function getLocalBlob() {
  return {
    builds: lsGet(KEYS.builds, []),
    traitGroups: lsGet(KEYS.traitGroups, []),
    spellGroups: lsGet(KEYS.spellGroups, []),
  };
}

export function setLocalBlob(blob) {
  if (!blob) return;
  if (Array.isArray(blob.builds)) lsSet(KEYS.builds, blob.builds);
  if (Array.isArray(blob.traitGroups)) lsSet(KEYS.traitGroups, blob.traitGroups);
  if (Array.isArray(blob.spellGroups)) lsSet(KEYS.spellGroups, blob.spellGroups);
}

/** ---------- 存档（builds） ---------- */

export function getBuilds() {
  return lsGet(KEYS.builds, []);
}

export function saveBuild(name, query) {
  const builds = getBuilds().filter((b) => b.name !== name);
  builds.unshift({ name, ts: Date.now(), query });
  lsSet(KEYS.builds, builds.slice(0, 100));
  return builds;
}

export function deleteBuild(name) {
  const builds = getBuilds().filter((b) => b.name !== name);
  lsSet(KEYS.builds, builds);
  return builds;
}

/** ---------- 分组（groups） ---------- */

export function getGroups(type) {
  // type: "trait" | "spell"
  return lsGet(type === "trait" ? KEYS.traitGroups : KEYS.spellGroups, []);
}

function setGroups(type, groups) {
  lsSet(type === "trait" ? KEYS.traitGroups : KEYS.spellGroups, groups);
}

export function createGroup(type, name) {
  name = String(name || "").trim().slice(0, 30);
  if (!name) return getGroups(type);
  const groups = getGroups(type);
  if (!groups.some((g) => g.name === name)) groups.push({ name, items: [] });
  setGroups(type, groups);
  return groups;
}

export function deleteGroup(type, name) {
  const groups = getGroups(type).filter((g) => g.name !== name);
  setGroups(type, groups);
  return groups;
}

export function toggleGroupItem(type, groupName, item) {
  const groups = getGroups(type);
  const g = groups.find((x) => x.name === groupName);
  if (!g) return groups;
  const idx = g.items.indexOf(item);
  if (idx >= 0) g.items.splice(idx, 1);
  else g.items.push(item);
  setGroups(type, groups);
  return groups;
}

/** item 当前所在的分组名列表 */
export function groupsOfItem(type, item) {
  return getGroups(type)
    .filter((g) => g.items.indexOf(item) >= 0)
    .map((g) => g.name);
}

/** 当前过滤条件（分组名 | ""全部 | "__ungrouped"未分组）下 item 是否可见 */
export function itemVisible(groups, filter, item) {
  if (!filter) return true;
  if (filter === "__ungrouped") {
    return !groups.some((g) => g.items.indexOf(item) >= 0);
  }
  const g = groups.find((x) => x.name === filter);
  return !!g && g.items.indexOf(item) >= 0;
}
