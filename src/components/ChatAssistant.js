import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPaperPlane, faStop } from "@fortawesome/free-solid-svg-icons";
import { t, getLang } from "../functions/lang";

// 与页面同源（dev server 把 /api 代理到 127.0.0.1:8801），便于内网穿透后远程使用
const API_BASE = "";

const KIND_LABELS = {
  creature: () => t("生物", "Creature"),
  trait: () => t("特性", "Trait"),
  relic: () => t("圣物", "Relic"),
  spec: () => t("专精", "Spec"),
  perk: () => t("专长", "Perk"),
  spell: () => t("法术", "Spell"),
  boss: () => t("首领", "Boss"),
  formula: () => t("公式", "Formula"),
};

/**
 * 右侧可收起的「问答助手」（统一入口）：
 *  - 知识库精确命中 -> 直接秒回（不依赖大模型）；
 *  - 未命中 -> 本地大模型结合游戏知识库 + RAG 资料回答；
 *  - 模糊候选 -> 直接渲染成按钮，点击即查（无需回复数字）；
 *  - 回复中提到的实体渲染成可拖拽标签，可拖进 planner 的
 *    特性槽 / 圣物槽 / 专精 / 涂油；
 *  - 提问时自动附带 planner 当前配队（实时读取）。
 */
class ChatAssistant extends Component {
  constructor(props) {
    super(props);
    let sid = sessionStorage.getItem("su_chat_sid");
    if (!sid) {
      sid = "web" + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem("su_chat_sid", sid);
    }
    this.sid = sid;
    this.msgEnd = React.createRef();
    this.state = {
      open: false,
      busy: false,
      apiUp: null, // null=未检测
      llmUp: null,
      input: "",
      preview: null, // 点击放大的图片 dataURL
      hoverImg: null, // 悬停实体标签时的卡片图预览 {src, left, top, below}
      messages: [
        {
          role: "bot",
          text: t(
            "你好！我是 Siralim 问答助手：\n· 查资料直接问（生物/特性/专精/专长/法术/圣物/领域），精确命中秒回；\n· 分析构筑、配合建议由本地大模型结合知识库回答，并自动参考你当前配置的队伍；\n· 回复中的实体标签可以直接拖进左侧 planner 的槽位。\n\n试试：狮鹫俯冲轰炸机、憎恶（种族）、布料憎恶、哪些专长配合燃烧？",
            "Hi! Ask me anything about Siralim Ultimate: instant answers for data lookups (creatures/traits/perks/relics...), build analysis by a local LLM grounded on the knowledge base, aware of your current party.\nDrag entity chips from replies into planner slots."
          ),
        },
      ],
    };
  }

  componentDidMount() {
    this.ping();
    this.pingLlm();
  }

  pingLlm = () => {
    fetch(API_BASE + "/api/llm/ping")
      .then((r) => r.json())
      .then((d) => this.setState({ llmUp: !!d.ok }))
      .catch(() => this.setState({ llmUp: false }));
  };

  componentDidUpdate(_prev, prevState) {
    // 仅当消息列表真正变化（新增消息或流式增量）时才滚动到底；
    // 悬停预览等无关状态更新不得触发滚动（否则页面会被瞬间拉到底部）
    const msgs = this.state.messages;
    const prevMsgs = _prev ? _prev.messages : null;
    const changed =
      msgs.length !== (prevMsgs ? prevMsgs.length : 0) ||
      (msgs.length &&
        prevMsgs &&
        prevMsgs.length &&
        msgs[msgs.length - 1].text !== prevMsgs[prevMsgs.length - 1].text);
    if (changed && this.msgEnd.current && this.state.open) {
      this.msgEnd.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  ping() {
    fetch(API_BASE + "/api/ping", { method: "GET" })
      .then((r) => r.ok && this.setState({ apiUp: true }))
      .catch(() => this.setState({ apiUp: false }));
  }

  toggle = () => {
    const open = !this.state.open;
    if (open && this.state.apiUp === null) this.ping();
    this.setState({ open });
  };

  sendText = (q) => {
    if (!q || this.state.busy) return;
    // 立刻加入 用户消息 + 空的 bot 占位消息（流式增量往占位里写）
    const msgs = this.state.messages.concat([
      { role: "user", text: q },
      { role: "bot", text: "", streaming: true },
    ]);
    this.setState({ messages: msgs, input: "", busy: true });

    // 对话历史（最近 8 条，截断），让“这个专精”这类指代能接上文
    const history = this.state.messages
      .filter((m) => m.role === "user" || m.role === "bot")
      .slice(-8)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant",
                     content: String(m.text || "") }));

    // 实时读取 planner 当前配队（由父组件提供快照函数）
    let partyParam = "";
    if (typeof this.props.getPartyContext === "function") {
      try {
        const ctx = this.props.getPartyContext();
        if (ctx) partyParam = "&party=" + encodeURIComponent(JSON.stringify(ctx));
      } catch (e) {
        /* 忽略配队读取失败 */
      }
    }
    const url =
      API_BASE +
      "/api/ask?stream=1&q=" +
      encodeURIComponent(q) +
      "&lang=" +
      (getLang() === "en" ? "en" : "cn") +
      "&sid=" +
      encodeURIComponent(this.sid) +
      "&history=" +
      encodeURIComponent(JSON.stringify(history)) +
      partyParam;

    // 流式接收（SSE）；停止按钮通过 AbortController 中断
    this.controller = new AbortController();
    const updateLast = (patch) => {
      this.setState((st) => {
        const arr = st.messages.slice();
        const last = arr[arr.length - 1];
        arr[arr.length - 1] = { ...last, ...patch };
        return { messages: arr, apiUp: true };
      });
    };
    const appendText = (piece) => {
      this.setState((st) => {
        const arr = st.messages.slice();
        const last = arr[arr.length - 1];
        arr[arr.length - 1] = { ...last, text: (last.text || "") + piece };
        return { messages: arr };
      });
    };

    fetch(url, { signal: this.controller.signal })
      .then((res) => {
        if (!res.ok || !res.body) throw new Error("http " + res.status);
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buf = "";
        const pump = () =>
          reader.read().then(({ done, value }) => {
            if (done) {
              this.setState({ busy: false });
              return;
            }
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n\n")) >= 0) {
              const frame = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              const line = frame.trim();
              if (!line.startsWith("data:")) continue;
              let evt;
              try {
                evt = JSON.parse(line.slice(5).trim());
              } catch (e) {
                continue;
              }
              if (evt.type === "meta") {
                updateLast({
                  route: evt.route,
                  images: evt.images || [],
                  candidates: evt.candidates || [],
                  entities: evt.entities || [],
                  picker: evt.picker || null,
                  streaming: true,
                });
                // 清单型问题命中大量条目：自动打开特性选择窗口列出
                if (evt.picker &&
                    typeof this.props.onOpenPicker === "function") {
                  this.props.onOpenPicker(evt.picker);
                }
              } else if (evt.type === "delta") {
                appendText(evt.text || "");
              } else if (evt.type === "done") {
                const patch = { streaming: false };
                if (evt.entities && evt.entities.length)
                  patch.entities = evt.entities;
                updateLast(patch);
                this.setState((st) => {
                  const arr = st.messages.slice();
                  const last = arr[arr.length - 1];
                  if (last && last.role === "bot" && last.text)
                    arr[arr.length - 1] = { ...last, text: last.text.replace(/\s+$/, "") };
                  return { messages: arr, busy: false };
                });
                return;
              } else if (evt.type === "error") {
                appendText("\n\n" + (evt.text || "服务出错"));
              }
            }
            return pump();
          });
        return pump();
      })
      .catch((err) => {
        if (err && err.name === "AbortError") {
          // 用户点了停止：保留已生成的部分
          this.setState((st) => {
            const arr = st.messages.slice();
            const last = arr[arr.length - 1];
            if (last && last.role === "bot") {
              arr[arr.length - 1] = {
                ...last,
                streaming: false,
                text: (last.text || "") + t("\n\n（已停止生成）", "\n\n(stopped)"),
              };
            }
            return { messages: arr, busy: false };
          });
          return;
        }
        const errText = t(
          "连不上问答服务。\n请在服务器上运行：D:\\siralim\\qq-kb-assistant\\启动问答服务.bat\n首次启动加载知识库约需 1 分钟。",
          "Cannot reach the QA service.\nRun D:\\siralim\\qq-kb-assistant\\启动问答服务.bat first (first start takes ~1 min)."
        );
        this.setState((st) => {
          const arr = st.messages.slice();
          const last = arr[arr.length - 1];
          if (last && last.role === "bot") {
            arr[arr.length - 1] = { ...last, streaming: false, text: errText };
          } else {
            arr.push({ role: "bot", text: errText });
          }
          return { messages: arr, busy: false, apiUp: false };
        });
      });
  };

  stopGenerate = () => {
    if (this.controller) {
      try {
        this.controller.abort();
      } catch (e) {
        /* noop */
      }
    }
  };

  send = () => {
    this.sendText(this.state.input.trim());
  };

  handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  };

  /** 拖拽实体标签开始：把实体 JSON 放入 dataTransfer */
  onEntityDragStart = (ent) => (e) => {
    e.dataTransfer.setData(
      "application/su-entity",
      JSON.stringify({ kind: ent.kind, uid: ent.uid, key: ent.key, anoint: ent.anoint })
    );
    e.dataTransfer.effectAllowed = "copyMove";
  };

  /** 实体标签/候选按钮的拖放目标提示文案 */
  entityTargetHint = (ent) => {
    if (ent.kind === "relic") return t("拖到某队伍成员的圣物槽", "Drag onto a member's relic slot");
    if (ent.kind === "spec") return t("拖到左侧专精栏", "Drag onto the specialization panel");
    if (ent.kind === "perk")
      return ent.anoint === false
        ? t("该专长不可涂油，无法拖入涂油栏", "This perk cannot be anointed")
        : t("拖到专精栏或涂油窗口里", "Drag onto the spec panel / anointments window");
    if (ent.kind === "creature")
      return t("拖到某队伍成员的生物卡或任意特性槽；点击可查看生物卡", "Drag onto a member's profile or trait slot; click to look up");
    if (ent.kind === "spell")
      return t("点击查询该法术；悬停可预览卡片图", "Click to look up; hover to preview its card");
    if (ent.kind === "boss")
      return t("点击查询该首领；悬停可预览首领卡", "Click to look up; hover to preview its boss card");
    if (ent.kind === "formula")
      return t("点击查询该公式；悬停可预览公式卡", "Click to look up; hover to preview its formula card");
    return t("拖到某队伍成员的任意特性槽；点击可查询", "Drag onto any trait slot; click to look up");
  };

  /** 实体显示名：中文名 英文名 */
  entityDisplay = (ent) => {
    const cn = ent.name_cn || ent.name || "";
    const en = ent.name_en && ent.name_en !== cn ? " " + ent.name_en : "";
    return cn + en;
  };

  /** 悬停实体标签：预览该条目的服务端渲染卡片图（放大显示） */
  showEntityPreview = (ent) => (e) => {
    const name = ent.name_cn || ent.name;
    if (!name) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const src =
      API_BASE +
      "/api/entry_image?kind=" +
      encodeURIComponent(ent.kind || "") +
      "&name=" +
      encodeURIComponent(name);
    const pos = {
      src,
      below: rect.top < window.innerHeight * 0.55,
      left: rect.left + rect.width / 2,
      top: rect.top,
    };
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => this.setState({ hoverImg: pos }), 250);
  };

  hideEntityPreview = () => {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.setState({ hoverImg: null });
  };

  componentWillUnmount() {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
  }

  render() {
    const { open, messages, input, busy, apiUp, llmUp, preview, hoverImg } = this.state;
    return (
      <div id="chat-assistant" className={open ? "chat-open" : "chat-collapsed"}>
        {/* 悬停实体标签时的卡片图预览（服务端渲染，放大显示） */}
        {hoverImg && (
          <div
            className={
              "chat-hover-preview" + (hoverImg.below ? " below" : "")
            }
            style={{ left: hoverImg.left, top: hoverImg.top }}
          >
            <img src={hoverImg.src} alt="" />
            <div className="chat-hover-preview-tip">
              {t("移开鼠标关闭", "Move away to close")}
            </div>
          </div>
        )}
        {/* 图片放大预览（点击聊天里的图打开，点击任意处关闭） */}
        {preview && (
          <div className="chat-img-preview-mask" onClick={() => this.setState({ preview: null })}>
            <img src={preview} alt="" />
          </div>
        )}
        {/* 左缘收起/展开条（与专精栏 toggle-bar 同款交互） */}
        <div
          className="chat-toggle-bar"
          onClick={this.toggle}
          title={open ? t("收起", "Collapse") : t("展开问答助手", "Expand assistant")}
        >
          <FontAwesomeIcon icon={open ? faChevronRight : faChevronLeft} />
        </div>
        <div className="chat-assistant-inner">
          <div className="chat-assistant-header">
            <span>{t("问答助手", "Assistant")}</span>
            <span className="chat-assistant-status-group">
              <span
                className={"chat-assistant-status " + (apiUp ? "up" : "down")}
                title={apiUp ? t("知识库服务正常", "KB up") : t("服务未启动", "Service offline")}
              >
                {t("库", "KB")}
                {apiUp === false ? "×" : "●"}
              </span>
              <span
                className={
                  "chat-assistant-status " + (llmUp ? "up" : llmUp === false ? "down" : "idle")
                }
                title={
                  llmUp
                    ? t("大模型已连接", "LLM connected")
                    : t("大模型未连接（仅知识库检索可用）", "LLM offline (KB lookups still work)")
                }
              >
                {t("AI", "AI")}
                {llmUp ? "●" : llmUp === false ? "×" : "…"}
              </span>
            </span>
          </div>
          <div className="chat-assistant-messages">
            {messages.map((m, i) => {
              // 结构化候选（服务端只在真正的候选列表消息上给出）：
              // 带类别标签（生物/特性/专长…），可点击查询、可拖进 planner
              const candidates =
                m.role === "bot" &&
                m.route &&
                m.route.indexOf("kb") === 0 &&
                Array.isArray(m.candidates)
                  ? m.candidates
                  : [];
              const isCandidateList = candidates.length >= 2;
              const entities = isCandidateList ? [] : m.entities || [];
              return (
                <div
                  key={i}
                  className={
                    "chat-msg chat-msg-" + m.role +
                    (m.streaming ? " chat-msg-streaming" : "")
                  }
                >
                  {m.route === "llm" && (
                    <span className="chat-route-badge chat-route-llm">AI</span>
                  )}
                  {(m.route === "kb" || m.route === "kb-reference") &&
                    !isCandidateList && (
                      <span className="chat-route-badge chat-route-kb">
                        {m.route === "kb-reference"
                          ? t("知识库（AI 离线）", "KB (AI offline)")
                          : t("知识库", "KB")}
                      </span>
                    )}
                  {!isCandidateList && (
                    <div className="chat-msg-text">
                      {String(m.text || "")
                        .split("\n")
                        .map((line, j) => (
                          <p key={j}>{line || "\u00a0"}</p>
                        ))}
                    </div>
                  )}
                  {m.picker && !isCandidateList && (
                    <button
                      className="chat-open-picker-btn"
                      onClick={() =>
                        typeof this.props.onOpenPicker === "function" &&
                        this.props.onOpenPicker(m.picker)
                      }
                    >
                      {m.picker.kind === "spell"
                        ? t(
                            "在法术库中查看这些条目",
                            "View these entries in the spell library"
                          )
                        : t(
                            "在特性选择窗口中查看这些条目",
                            "View these entries in the trait picker"
                          )}
                    </button>
                  )}
                  {isCandidateList && (
                    <div className="chat-candidates">
                      {candidates.map((c, j) => {
                        const ent = {
                          kind: c.kind, uid: c.uid, key: c.key, anoint: c.anoint,
                        };
                        const draggable =
                          c.kind === "creature" || c.kind === "trait" ||
                          c.kind === "relic" || c.kind === "spec" ||
                          c.kind === "perk";
                        return (
                          <button
                            key={j}
                            className={
                              "chat-candidate-btn" +
                              (c.kind ? " chat-entity-" + c.kind : "")
                            }
                            draggable={draggable}
                            onDragStart={
                              draggable ? this.onEntityDragStart(ent) : undefined
                            }
                            onClick={() => this.sendText(c.send || c.label)}
                            onMouseEnter={this.showEntityPreview({
                              kind: c.kind,
                              name: c.label,
                              name_cn: c.label,
                            })}
                            onMouseLeave={this.hideEntityPreview}
                            title={
                              (draggable ? this.entityTargetHint(ent) + "；" : "") +
                              t("点击直接查询", "Click to look up")
                            }
                          >
                            {c.label}
                            {c.en ? " " + c.en : ""}
                            {"（" + c.tag + "）"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {entities.length > 0 && (
                    <div className="chat-entities">
                      {entities.map((ent, j) => {
                        const draggable =
                          ent.kind !== "spell" && ent.kind !== "boss" && ent.kind !== "formula";
                        return (
                          <span
                            key={j}
                            className={"chat-entity-chip chat-entity-" + ent.kind}
                            draggable={draggable}
                            onDragStart={
                              draggable ? this.onEntityDragStart(ent) : undefined
                            }
                            onClick={() =>
                              this.sendText(ent.name_cn || ent.name)
                            }
                            onMouseEnter={this.showEntityPreview(ent)}
                            onMouseLeave={this.hideEntityPreview}
                            title={this.entityTargetHint(ent)}
                          >
                            {this.entityDisplay(ent)}
                            {"（"}
                            {KIND_LABELS[ent.kind] ? KIND_LABELS[ent.kind]() : ""}
                            {"）"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {(m.images || []).map((src, j) => (
                    <img
                      key={j}
                      className="chat-msg-img"
                      src={src}
                      alt=""
                      title={t("点击放大", "Click to enlarge")}
                      onClick={() => this.setState({ preview: src })}
                    />
                  ))}
                </div>
              );
            })}
            {busy &&
              !(messages.length > 0 &&
                messages[messages.length - 1].role === "bot" &&
                messages[messages.length - 1].text) && (
              <div className="chat-msg chat-msg-bot">
                <div className="chat-msg-text chat-typing">
                  {t("思考中…", "Thinking…")}
                </div>
              </div>
            )}
            <div ref={this.msgEnd} />
          </div>
          <div className="chat-assistant-input">
            <input
              value={input}
              placeholder={t("查资料或问构筑，如：哪些专长配合燃烧？", "Ask data or builds…")}
              onChange={(e) => this.setState({ input: e.target.value })}
              onKeyDown={this.handleKey}
            />
            {busy ? (
              <button
                onClick={this.stopGenerate}
                className="chat-stop-btn"
                title={t("停止生成", "Stop generating")}
              >
                <FontAwesomeIcon icon={faStop} />
              </button>
            ) : (
              <button
                onClick={this.send}
                disabled={!input.trim()}
                title={t("发送", "Send")}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ChatAssistant;
