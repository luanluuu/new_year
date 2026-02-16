# 除夕快乐 (Chuxi Happy)

2026 农历新年倒计时网页，包含精美的 Canvas 烟花特效和传统节日氛围。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ 特性

- **精准倒计时**：实时计算距离 2026 年农历新年的时间。
- **烟花特效**：基于 HTML5 Canvas 的高性能粒子烟花动画。
- **沉浸式音效**：点击屏幕触发烟花爆炸音效（Web Audio API）。
- **响应式设计**：完美适配桌面端和移动端设备。
- **高度可配置**：通过 `script.js` 中的 `CONFIG` 对象轻松调整参数。

## 🚀 快速开始

### 本地预览

直接在浏览器中打开 `index.html` 即可预览效果。

### 部署

本项目是一个纯静态网页，可以部署在任何静态托管服务上。

#### GitHub Pages (推荐)

1. Fork 本仓库。
2. 进入仓库设置 -> Pages。
3. Source 选择 `main` 分支，保存即可。

#### Vercel / Netlify

1. 导入 GitHub 仓库。
2. 保持默认设置，点击 Deploy。

## ⚙️ 配置说明

项目默认开启了**演示模式**（10秒倒计时），以便快速预览新年效果。

如需用于正式倒计时，请修改 `script.js` 中的配置：

```javascript
const CONFIG = {
    SIMULATION: {
        ENABLED: false, // 设置为 false 关闭演示模式，使用真实时间
        // ...
    },
    // ...
};
```

更多可配置项包括音频参数、烟花粒子数量、发射频率等，均可在 `CONFIG` 对象中调整。

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。
