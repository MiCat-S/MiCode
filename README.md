<p align="center">
  <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="MI Code" />
</p>

<h1 align="center">MI Code</h1>

<p align="center"><strong>中文</strong> · <a href="./README.en.md">English</a></p>

MI Code 是 [T3 Code](https://github.com/pingdotgg/t3code) 的非官方分支，由个人独立维护，与 T3 Tools, Inc. 无关，也不受其认可。它在你的电脑上运行编程智能体，你可以从桌面、网页和手机上使用。Claude Code、Codex、Cursor 等工具直接沿用你电脑上已有的订阅和配置。

MI Code 会定期合并上游 T3 Code 的更新，下面这些地方和上游不同。

## 和上游 T3 Code 的不同

- **移除了 T3 Connect。** 桌面、网页、iOS 和命令行里的 T3 账号登录、云中继和相关入口都已去掉。手机和其他设备通过局域网、VPN 或 SSH 直接连接电脑，见[远程连接说明](./docs/user/remote-access.md)。依赖中继的设备自动发现、访客链接和远程活动推送也随之停用。以前只通过云中继连接过的设备，需要用电脑的直连地址重新配对。
- **Codex 使用自己原本的身份。** 上游启动 Codex 时会把客户端名改成 T3 Code。MI Code 不改：会话和模型探测使用和终端里直接运行 `codex` 相同的 `codex-tui` 标识和实际版本号，生成标题等后台任务使用 `codex exec` 自带的 `codex_exec` 标识。
- **空闲会话保留时间可以调整。** 上游在一轮结束 2 分钟后就结束可续接的智能体进程。MI Code 默认保留 30 分钟，可以在「设置 → 维护 → 后台活动 → 会话空闲超时」里修改。
- **从本仓库获取更新。** 桌面版从本仓库的 [GitHub Releases](https://github.com/MiCat-S/MiCode/releases) 检查更新，默认开启，可以在「设置 → 关于」里关闭自动检查，关闭后仍可手动检查。macOS 安装包使用固定的自签名证书，没有经过 Apple 公证。版本标签的格式是 `v0.1.14+micode.1`。
- **优化提示词。** 输入框里模型按钮旁边多了一个优化按钮，点一下会把草稿改写成更清楚、更有条理的提示词，直接替换输入框内容，不满意可以撤销。在已有对话里会参考最近几轮上下文。改写指令和模型可以在「设置 → 会话 → 提示词优化」里修改，见[说明](./docs/user/composer.md#enhance-a-prompt)。
- **默认不收集使用数据。** 产品使用统计和连接诊断默认关闭。手机端的诊断开关和 Expo 热更新也默认关闭，见[诊断与更新设置](./docs/user/telemetry.md)。
- **接管 `t3` 命令。** 在设置里安装命令时，如果 `t3` 是 T3 Code 装的，MI Code 会把它换成自己的；其他程序写入的同名文件不会被覆盖。
- **使用独立的应用 ID。** 桌面版的应用 ID 是 `io.github.micats.micode`，可以和 T3 Code 同时安装。两者默认共用 `~/.t3` 里的数据，格式也相同。如果想让 MI Code 使用一份独立的数据，启动前把 `T3CODE_HOME` 设为另一个目录。

## 安装

- **macOS。** 在 [Releases](https://github.com/MiCat-S/MiCode/releases) 下载最新的 DMG，拖进「应用程序」。安装包没有经过 Apple 公证，第一次打开如果被 macOS 拦截，到「系统设置 → 隐私与安全性」里点「仍要打开」。装好之后，后续版本可以在应用内更新。
- **iPhone。** Releases 里提供未签名的 IPA，需要用你自己的 Apple 证书和描述文件签名后才能安装。也可以按[移动端构建说明](./apps/mobile/README.md)自己构建；用 Xcode 个人团队开发时，按其中的本地构建步骤操作。
- **从源码运行。** 在仓库根目录先用 `vp i` 安装锁定版本的依赖，再运行 `vp run dev`，打开终端里输出的链接。[开发指南](./docs/operations/00_development.md)介绍了 macOS、Windows 和 Linux 的构建和打包。

## 问题反馈

MI Code 的问题请提交到[本仓库](https://github.com/MiCat-S/MiCode/issues)。继承自上游的代码结构见[架构说明](./docs/internals/01_architecture.md)和[文档目录](./docs/README.md)。

## 许可证

源代码使用 [MIT 许可证](./LICENSE)，保留了原始版权声明。T3 Code 商标的使用规则见[上游商标政策](./TRADEMARK.md)。
