# 弹幕发送面板：独立悬浮拖拽化升级设计方案 (Draggable Floating Danmaku Panel Design)

根据需求，我们将弹幕发送面板升级为**完全独立于进度条/控制栏、支持全鼠标拖拽、防自动隐藏、具备毛玻璃质感**的极致浮动窗口。

## 1. 核心改进策略

### 🚀 物理结构解耦
- **原设计**：面板挂载在 `.art-control`（弹幕控制按钮）内部，这会导致控制栏隐藏时，面板也随之隐藏，并且定位深受控制栏本身宽度的束缚。
- **新设计**：将 `.apd-danmaku-emitter` 直接通过 `art.template.$container.appendChild` 挂载到**播放器根容器**下。这样控制栏即使自动隐藏，弹幕面板仍然完全不受影响，独立渲染。

### 🖱️ 丝滑高精度拖拽
- 使用 `mousedown` / `mousemove` / `mouseup` 模式捕获鼠标轨迹，动态修改面板的 `style.left` 和 `style.top`。
- **边界防御**：在拖拽移动事件中，计算播放器实时宽度和高度，并减去面板本身的宽高，限制面板**绝对无法超出播放器窗口的物理边界**。
- **按键过滤**：智能判断点击事件目标，如果用户点击的是输入框、选色小圆点、发送按钮或关闭按钮，**不触发拖拽动作**，保障正常交互。

### ⚙️ 独立自动隐藏与防断机制
- 移除之前的所有悬停（hover-in / hover-out）自动触发逻辑。
- **输入聚焦保护**：如果用户的光标正处于输入框之内（`document.activeElement === input`），**绝不自动隐藏面板**。
- **播放器内点击保持**：如果用户在播放器内点击（如点击视频进行播放/暂停、调节音量等）且未聚焦输入框时，**仍然保持面板显示**，使用户可以边看视频边随意调整它的位置。
- **外部点击关闭**：只有当用户点击了播放器容器**完全外部**的区域，或者主动点击关闭 (`×`) 按钮 / 再次点击控制栏 `“弹”` 按钮时，面板才会淡出收起。

---

## 2. 详细文件修改内容

### 💅 样式优化：`src/styles/artplayer-liquid-glass.css`
1. 将选择器从 `.artplayer-plugin-liquid-glass .art-control .apd-danmaku-emitter` 改为 `.artplayer-plugin-liquid-glass .apd-danmaku-emitter`，以匹配挂载在容器根目录的新 DOM 结构。
2. 彻底移除 `position`, `bottom`, `left`, `right`, `top`, `margin`, `transform` 上的 `!important` 限制，确保 JavaScript 拖拽设置的 inline style 绝对有效。
3. 增加精致头部拖拽标题栏样式：
   - 包含 `.apd-danmaku-header`、`.apd-danmaku-title` 和 `.apd-danmaku-close`（支持 hover 变粉色动效与鼠标 `cursor: move` 拖动光标指示）。

### ⌨️ 逻辑重构：`src/app/play/page.tsx`
1. 修改控制栏 `“弹”` 按钮点击回调：通过 `art.template.$container` 查找弹幕面板，实现状态切换并管理提示气泡 `aria-label` 的擦除与恢复。
2. 重构面板 DOM 初始化逻辑：
   - 插入拖拽标题头 HTML。
   - 剥离鼠标 `mouseenter`/`mouseleave` 监听。
   - 注册高水准的边界安全拖动计算器。
   - 更新全局点击 `handleGlobalClick` 区域检测函数。
