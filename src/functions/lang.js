// 全局语言切换：cn=纯中文 / en=纯英文（原版样式）
// 持久化到 localStorage；切换后由 App.js 通过 key 强制整树重渲染，
// 各组件在渲染时通过 t()/D() 读取当前语言。
let lang = localStorage.getItem("su_lang") || "cn";

export function getLang() {
  return lang;
}

export function setLang(l) {
  lang = l === "en" ? "en" : "cn";
  localStorage.setItem("su_lang", lang);
  document.title = lang === "cn" ? "Siralim Planner 中文版" : "Siralim Planner";
  window.dispatchEvent(new Event("su-lang-change"));
}

// 静态界面文案：t(中文, 英文)
export function t(cn, en) {
  return lang === "cn" ? cn : en;
}

// 数据字段：D(对象, 中文字段名, 英文字段名)；中文缺失时回退英文
export function D(obj, cnField, enField) {
  if (!obj) return "";
  if (lang === "cn") {
    const v = obj[cnField];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return enField ? obj[enField] : "";
}
