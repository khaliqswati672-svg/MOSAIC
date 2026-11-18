# MOSAIC

**Every Place Tells a Story.** 每一个去过的地方，都有属于自己的故事。

## 本地运行

使用 Node.js 22。在 PowerShell 中运行：

```powershell
npm ci
npm run dev
```

打开 Vite 打印的本地地址（默认 http://localhost:5173）。需支持 WebGL 2 的浏览器。浏览器定位与 Web Crypto 需要 localhost 或 HTTPS。生产构建使用 `npm run build`，可用 `npm run preview` 预览。

## 演示路径

1. 注册本地账号并登录。拖动地球并点击中国，或点「定位中国」。再次点击中国或选择「进入国家地图」。
2. 在中国地图点选贵州省，进入「点亮这个地方」。
3. 选择「旅行凭证上传」，使用已脱敏的 JPG、PNG 或 WebP 测试图片。提交时显示 Pending Review。选择「演示通过」后显示演示点亮标记。人工资料审核提供同样的待审、通过、拒绝状态。
4. 返回贵州省。分别创建一条照片和一条 MP4 旅行记录，填写标题、地点和日期。
5. 打开旅行记忆，通过滚轮、上下滑动或按钮切换。点击照片放大，视频使用播放器控制。刷新后到「我的地图」确认足迹仍在。

位置验证需要主动授权。仅接受精度数值为 150 米以内且落在目标行政区的定位。应用检查精度范围的采样点，避免明显贴近边界的误判。业务数据只保存通过状态。验证结果基于本地浏览器与简化地图，适用于个人记录。

## 目录

```text
public/
  china.geojson          中国一级行政区简化边界
  earth.jpg              Blue Marble 全球纹理
src/
  main.jsx               登录、导航及路由入口
  account.js             本地演示账号和会话
  Globe.jsx              Three.js 地球、射线拾取、镜头控制
  maps.js                行政区数据接口与定位边界判断
  Country.jsx            行政区 SVG 地图
  TravelPages.jsx        国家、地区、个人地图与业务路由
  Verification.jsx       定位和两类演示审核
  Memory.jsx             旅行记录表单和媒体浏览
  repository.js          IndexedDB、上传校验与地区状态
  style.css, atlas.css   响应式视觉样式
tests/
  journey.spec.js        Edge/Chromium 端到端验收
  fixtures/flower.mp4    CC0 上传与播放样本
playwright.config.js     测试配置
```

## 数据与许可

- 世界国家边界来自 world-atlas 的 Natural Earth 1:110m 数据，公有领域。此比例尺有简化，小型岛国和边界依数据覆盖。 [world-atlas](https://github.com/topojson/world-atlas) · [Natural Earth 使用条款](https://www.naturalearthdata.com/about/terms-of-use/)
- 中国行政区来自 geoBoundaries gbOpen CHN ADM1，含 34 个一级行政区。该数据集元数据标为 Public Domain，来源为 geoBoundaries、Wikimedia Commons。应用规范化了环方向，并把源数据的英文误标 “Guangzhou Province” 显示为广东省，保留原几何。 [数据与许可元数据](https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/)
- 地球纹理由 NASA Goddard Space Flight Center 的 Blue Marble 影像提供，影像署名 Reto Stöckli，视觉增强 Robert Simmon，从 three-globe 示例镜像取得。使用适用 NASA 影像公开使用条款。 [NASA 影像说明](https://science.nasa.gov/resource/blue-marble/) · [NASA 使用条款](https://www.nasa.gov/nasa-brand-center/images-and-media/) · [示例镜像](https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg)

## 本地数据与服务接口

LocalStorage 存储演示账号与会话，IndexedDB 存储分账号索引的媒体 Blob、旅行元数据和审核记录。应用在同一浏览器来源内恢复数据。清除该站点数据、换浏览器或改端口会影响访问原数据。凭证提交要求在上传前手动脱敏。

后端接入时，可保持页面契约并替换 `account` 与 `repository` 适配器，将审核状态机和账号权限移到 Spring Boot，结构化数据持久化到 MySQL，媒体通过短时签名链接访问私有对象存储。

## 验收命令

若系统已安装 Edge：

```powershell
$env:MOSAIC_BROWSER='msedge'
npm test
```

也可运行 `npx playwright install chromium` 后使用 `npm test`。测试自动启用独立 Vite 端口 5187，测试视频来自 MDN 的 CC0 样本。 [MDN 视频样本](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)
