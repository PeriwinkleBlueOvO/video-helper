
# Video Helper

## English

**Video Helper** is a Chrome / Edge / Atlas browser extension for authorized web video workflow testing.

It helps developers and testers verify whether a web video page can be detected, controlled, and navigated by a browser extension. It is designed for owned or authorized test environments only.

Version: `2.3.3`

---

## Important Notice

This project is intended for:

- testing your own web video platform
- checking video page automation risks
- debugging course/resource navigation logic
- verifying whether frontend video controls are too easy to automate
- improving server-side anti-abuse design

Do **not** use this extension to bypass learning requirements, falsify attendance, fake video progress, or violate any platform rules.

Video Helper includes whitelist-based restrictions. The page control panel only appears on the configured test host.

---

## Supported Browsers

Video Helper can be used on Chromium-based browsers, including:

- Google Chrome
- Microsoft Edge
- Atlas Browser
- Other Chromium-based browsers that support unpacked extensions

---

## Features

### 1. First-run Configuration Page

After the extension is installed for the first time, Video Helper automatically opens a configuration page.

You can configure:

- allowed test URL / host
- wait limit
- scan interval

The Video Helper control panel only appears on the configured whitelist host.

---

### 2. Extension Popup Menu

Clicking the extension icon opens a simple menu:

- **Open Configuration**
- **Open Status Panel**
- **Coming Soon**

The extension popup is only used as an entry point. Runtime controls are shown inside the page control panel.

---

### 3. Page Control Panel

On a whitelisted website, Video Helper can open a floating control panel.

The panel includes:

- **Scan Page**
- **Play Current Video**
- **Next**
- **Highlight Next**
- **Start**
- **Stop**
- **Clear Highlights**

The panel can be minimized. When minimized, a small `Video Helper` chip remains in the corner so you can restore it.

---

### 4. Video and Button Detection

Video Helper scans the current page for:

- visible `<video>` elements
- possible video play buttons
- possible next-resource buttons

It avoids detecting its own UI elements and ignores common non-video buttons such as:

- 开始答题
- 答题
- 测验
- 考试
- 作业
- 练习
- quiz
- exam
- test
- homework
- exercise
- question

This reduces false detection when the page contains quizzes, exercises, homework, or exam buttons.

---

### 5. Configurable Timing

You can configure:

| Setting | Meaning | Default |
|---|---|---|
| Wait Limit | Maximum time to wait for a video after opening a resource | 180 seconds |
| Scan Interval | How often the page is scanned while waiting | 15 seconds |

Example:

```txt
Wait Limit = 60
Scan Interval = 5
````

This means Video Helper waits up to 60 seconds and scans every 5 seconds.

---

### 6. Next Resource Resolver

When the page has a native next button, Video Helper tries to use it first.

If no native next button exists, it tries to resolve the next resource by:

1. reading the current activity ID from the URL hash
2. scanning course/resource links in the page DOM
3. finding the current resource in the activity list
4. opening the next resource in order

This is useful for testing platforms where some resources do not provide an explicit "Next" button.

---

## Installation

### Chrome

1. Download or clone this repository.
2. Open:

```txt
chrome://extensions
```

3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the extension folder.
6. On first install, the configuration page will open automatically.

---

### Microsoft Edge

1. Download or clone this repository.
2. Open:

```txt
edge://extensions
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extension folder.
6. On first install, the configuration page will open automatically.

---

### Atlas Browser

1. Download or clone this repository.
2. Open the browser extension page:

```txt
chrome://extensions
```

or:

```txt
atlas://extensions
```

3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the extension folder.
6. On first install, the configuration page will open automatically.

---

## Basic Usage

### Step 1: Configure the allowed website

Open the configuration page and enter your test website:

```txt
https://test.example.com
```

or:

```txt
test.example.com
```

Then configure:

```txt
Wait Limit
Scan Interval
```

Click **Save Configuration**.

---

### Step 2: Open your test video page

Go to your whitelisted website.

Click the extension icon and choose:

```txt
Open Status Panel
```

The Video Helper panel should appear on the page.

---

### Step 3: Scan the page

Click:

```txt
Scan Page
```

Video Helper will highlight:

* detected videos
* possible play buttons
* possible next buttons

Green labels indicate video/play candidates.
Orange labels indicate next-resource candidates.

---

### Step 4: Start testing

Click:

```txt
Start
```

Video Helper will:

1. scan the current page
2. try to play the current video
3. wait for the video to end
4. try to open the next resource
5. wait for the next video
6. continue the workflow until no further resource is found

You can stop the process with:

```txt
Stop
```

---

### Step 5: Manual next during debugging

When debugging, you do not need to wait for timeout.

Click:

```txt
Next
```

Video Helper will immediately try to move to the next resource.

---

## Configuration Options

### Allowed Host

Only the saved host can show the Video Helper page control panel.

For example, if you save:

```txt
test.example.com
```

The extension will run on:

```txt
https://test.example.com/...
```

But it will not show the panel on unrelated websites.

---

### Wait Limit

The maximum time to wait for a video after opening a new resource.

Example:

```txt
60
```

Means:

```txt
Wait up to 60 seconds.
```

---

### Scan Interval

How often Video Helper scans the page while waiting for video content.

Example:

```txt
5
```

Means:

```txt
Scan every 5 seconds.
```

---

## Recommended Testing Checklist

Use Video Helper to check:

* whether video elements are directly exposed
* whether play buttons are easy to detect
* whether next-resource buttons are easy to detect
* whether non-video resources are skipped correctly
* whether the site has resources without a native next button
* whether frontend-only progress logic is too easy to automate
* whether server-side progress validation is strong enough

---

## Security and Anti-Abuse Suggestions

If Video Helper can easily automate your video workflow, consider improving your platform design.

Recommended server-side checks:

* do not trust frontend-only progress values
* do not allow direct `completed=true` updates
* use server-side watch sessions
* validate heartbeat timing
* validate video progress continuity
* reject large progress jumps
* prevent replayed progress requests
* rate-limit suspicious activity
* calculate completion on the server side
* do not rely only on mouse/focus/visibility checks

Frontend checks are useful, but they should not be the only source of truth.

---

## Project Structure

```txt
video-helper/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── content.js
├── content.css
├── README.md
└── LICENSE
```

---

## Version History

### 2.3.3

* Fixed false detection of quiz/exam/homework buttons as play controls.
* `开始答题` is no longer detected as a play button.
* Play detection now avoids generic "start" labels unless they are clearly related to video playback.

### 2.3.2

* Fixed self-detection issue.
* The scanner no longer detects Video Helper's own panel, buttons, labels, or progress UI.

### 2.3.1

* Project name changed to **Video Helper**.

### 2.3.0

* Added first-run configuration page.
* Added popup menu.
* Added whitelist-only page panel.
* Added minimizable page control panel.

### 2.2.0

* Moved `In Progress` from the center overlay into the page control panel.
* Simplified popup into a configuration window.

### 2.1.0

* Replaced Liquid Glass style with a readable high-contrast UI.
* Improved next-button filtering.

### 2.0.0

* Added configurable timing.
* Added manual `Next` button.
* Added path-based next-resource resolver.

---

## License

MIT License

---

## Disclaimer

This tool is for authorized testing and defensive analysis only.

Do not use it to violate academic integrity rules, platform terms, attendance requirements, or learning progress policies.

---

# Video Helper

## 中文

**Video Helper** 是一个适用于 Chrome / Edge / Atlas 浏览器的网页视频流程测试扩展。

它可以帮助开发者和测试人员检查：一个网页视频页面是否容易被浏览器扩展识别、控制和导航。这个项目只适用于你自己拥有或已经获得授权的测试环境。

版本：`2.3.3`

---

## 重要说明

本项目适用于：

* 测试你自己的网页视频平台
* 检查视频页面是否存在自动化风险
* 调试课程 / 资源导航逻辑
* 验证前端视频控件是否过于容易被自动化操作
* 改进服务端防刷和反滥用设计

请不要使用本扩展绕过学习要求、伪造考勤、伪造视频进度，或违反任何平台规则。

Video Helper 带有白名单限制。页面控制面板只会在配置好的测试网站上显示。

---

## 支持的浏览器

Video Helper 可以在基于 Chromium 的浏览器上使用，包括：

* Google Chrome
* Microsoft Edge
* Atlas Browser
* 其他支持加载未打包扩展的 Chromium 内核浏览器

---

## 功能特性

### 1. 首次安装配置页面

扩展首次安装后，Video Helper 会自动打开配置页面。

你可以配置：

* 允许测试的网址 / 域名
* 等待时间上限
* 扫描间隔

Video Helper 的页面控制面板只会在配置好的白名单网站上显示。

---

### 2. 插件弹窗菜单

点击扩展图标后，会出现一个简单菜单：

* **Open Configuration**
* **Open Status Panel**
* **Coming Soon**

扩展弹窗只作为入口使用。真正的运行控制按钮会显示在网页中的页面控制面板里。

---

### 3. 页面控制面板

在白名单网站中，Video Helper 可以打开一个浮动控制面板。

面板包含：

* **Scan Page**
* **Play Current Video**
* **Next**
* **Highlight Next**
* **Start**
* **Stop**
* **Clear Highlights**

面板可以最小化。最小化后，页面角落会保留一个小的 `Video Helper` 按钮，点击后可以恢复面板。

---

### 4. 视频和按钮识别

Video Helper 会扫描当前页面中的：

* 可见的 `<video>` 元素
* 疑似视频播放按钮
* 疑似下一资源按钮

它会避免识别自己的 UI 元素，并忽略常见的非视频按钮，例如：

* 开始答题
* 答题
* 测验
* 考试
* 作业
* 练习
* quiz
* exam
* test
* homework
* exercise
* question

这样可以减少在页面包含测验、练习、作业或考试按钮时的误判。

---

### 5. 可配置时间参数

你可以配置：

| 配置项           | 含义               | 默认值   |
| ------------- | ---------------- | ----- |
| Wait Limit    | 打开资源后，最多等待多久寻找视频 | 180 秒 |
| Scan Interval | 等待过程中，每隔多久扫描一次页面 | 15 秒  |

例如：

```txt
Wait Limit = 60
Scan Interval = 5
```

表示 Video Helper 最多等待 60 秒，并且每 5 秒扫描一次页面。

---

### 6. 下一资源解析器

如果页面中存在原生“下一节 / 下一个”按钮，Video Helper 会优先尝试使用它。

如果页面中没有原生下一按钮，它会尝试通过以下方式解析下一个资源：

1. 从当前 URL hash 中读取当前 activity ID
2. 扫描页面 DOM 中的课程 / 资源链接
3. 在资源列表中找到当前资源
4. 按顺序打开下一个资源

这适用于某些资源没有显式“下一节”按钮的平台。

---

## 安装方法

### Chrome

1. 下载或克隆本仓库。
2. 打开：

```txt
chrome://extensions
```

3. 开启 **Developer Mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择扩展文件夹。
6. 首次安装后，配置页面会自动打开。

---

### Microsoft Edge

1. 下载或克隆本仓库。
2. 打开：

```txt
edge://extensions
```

3. 开启 **Developer mode / 开发人员模式**。
4. 点击 **Load unpacked / 加载解压缩的扩展**。
5. 选择扩展文件夹。
6. 首次安装后，配置页面会自动打开。

---

### Atlas Browser

1. 下载或克隆本仓库。
2. 打开扩展管理页面：

```txt
chrome://extensions
```

或者：

```txt
atlas://extensions
```

3. 开启 **Developer Mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择扩展文件夹。
6. 首次安装后，配置页面会自动打开。

---

## 基本使用方法

### 第一步：配置允许测试的网站

打开配置页面，输入你的测试网站：

```txt
https://test.example.com
```

或者：

```txt
test.example.com
```

然后配置：

```txt
Wait Limit
Scan Interval
```

点击 **Save Configuration** 保存。

---

### 第二步：打开测试视频页面

进入你配置好的白名单网站。

点击扩展图标，选择：

```txt
Open Status Panel
```

Video Helper 的页面控制面板会出现在网页中。

---

### 第三步：扫描页面

点击：

```txt
Scan Page
```

Video Helper 会高亮：

* 检测到的视频
* 疑似播放按钮
* 疑似下一资源按钮

绿色标签表示视频 / 播放候选项。
橙色标签表示下一资源候选项。

---

### 第四步：开始测试

点击：

```txt
Start
```

Video Helper 会：

1. 扫描当前页面
2. 尝试播放当前视频
3. 等待视频结束
4. 尝试打开下一个资源
5. 等待下一个视频
6. 持续执行流程，直到找不到更多资源

你可以点击：

```txt
Stop
```

停止流程。

---

### 第五步：调试时手动进入下一个资源

调试时不需要一直等到超时。

点击：

```txt
Next
```

Video Helper 会立即尝试进入下一个资源。

---

## 配置项说明

### Allowed Host

只有保存的 host 可以显示 Video Helper 页面控制面板。

例如，如果你保存的是：

```txt
test.example.com
```

扩展会在以下页面中运行：

```txt
https://test.example.com/...
```

但不会在无关网站上显示控制面板。

---

### Wait Limit

打开新资源后，最多等待多久寻找视频。

例如：

```txt
60
```

表示：

```txt
最多等待 60 秒。
```

---

### Scan Interval

等待视频内容时，每隔多久扫描一次页面。

例如：

```txt
5
```

表示：

```txt
每 5 秒扫描一次。
```

---

## 推荐测试清单

你可以使用 Video Helper 检查：

* 视频元素是否直接暴露在页面中
* 播放按钮是否容易被识别
* 下一资源按钮是否容易被识别
* 非视频资源是否会被正确跳过
* 网站是否存在没有原生下一按钮的资源
* 只依赖前端的进度逻辑是否过于容易被自动化
* 服务端进度校验是否足够严格

---

## 安全与防滥用建议

如果 Video Helper 可以轻松自动化你的网站视频流程，建议加强平台设计。

推荐的服务端校验包括：

* 不要信任纯前端进度值
* 不要允许前端直接提交 `completed=true`
* 使用服务端观看会话
* 校验心跳时间间隔
* 校验视频进度连续性
* 拒绝异常的大进度跳跃
* 防止进度请求重放
* 对异常行为做频率限制
* 在服务端计算完成状态
* 不要只依赖鼠标、焦点、可见性检测

前端检测有价值，但不应该作为唯一可信来源。

---

## 项目结构

```txt
video-helper/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── content.js
├── content.css
├── README.md
└── LICENSE
```

---

## 版本记录

### 2.3.3

* 修复测验 / 考试 / 作业按钮被误识别为播放按钮的问题。
* `开始答题` 不再被识别为播放按钮。
* 播放识别不再使用泛泛的 “start / 开始” 文案，除非它明确和视频播放有关。

### 2.3.2

* 修复自我识别问题。
* 扫描器不再识别 Video Helper 自己的面板、按钮、标签和进度 UI。

### 2.3.1

* 项目名称改为 **Video Helper**。

### 2.3.0

* 新增首次安装配置页面。
* 新增插件弹窗菜单。
* 新增白名单内才显示页面控制面板。
* 新增可最小化页面控制面板。

### 2.2.0

* 将 `In Progress` 从页面中央移动到页面控制面板中。
* 将插件弹窗简化为配置窗口。

### 2.1.0

* 将 Liquid Glass 风格改为更清晰的高对比度界面。
* 改进下一按钮过滤逻辑。

### 2.0.0

* 新增可配置等待时间和扫描间隔。
* 新增手动 `Next` 按钮。
* 新增基于路径的下一资源解析器。

---

## License

MIT License

---

## 免责声明

本工具仅用于授权测试和防御性分析。

请勿使用本工具违反学术诚信规则、平台服务条款、考勤要求或学习进度政策。

```
```
#   v i d e o - h e l p e r  
 