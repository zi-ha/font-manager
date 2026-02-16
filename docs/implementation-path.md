# Font Manager 实现路径（Tauri + React + TypeScript + Rust）

## 1. 项目现状与目标
- 已识别为 Tauri v2 项目，配置文件位于 `src-tauri/tauri.conf.json`，标识符为 `com.font-manager.app`，窗口默认尺寸 800×600，符合最小尺寸要求。
- 前端为 Vite + React 18 + TypeScript，尚未集成 Tailwind 与 shadcn/ui。
- Rust 后端当前仅有示例命令 `greet`，无字体相关逻辑与依赖。
- 目标：实现 Windows 字体管理工具，覆盖字体读取、字重归类、预览、安装、卸载、搜索筛选，并保证打包与权限配置符合 Tauri 规范与 Windows 安全要求。

## 2. 架构与数据流
- 前端 UI：React + TypeScript，使用 Tailwind CSS 与 shadcn/ui 实现 Windows 11 风格界面。
- 前端调用：通过 `@tauri-apps/api` 调用 Rust 命令，严格类型化请求与响应。
- 后端核心：Rust 集成字体数据库与解析库（`fontdb`），结合 Windows API 完成字体枚举、安装与卸载。
- 数据流：Rust 收集系统字体元数据 → 返回 `FontFamily` 与 `FontVariant` 列表 → 前端归类展示与筛选 → 用户操作触发安装/卸载 → Rust 执行文件复制与注册表更新 → 前端提示结果。

## 3. 目录与模块规划
```
font-manager/
├─ src/                                  前端源代码
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ styles/                             Tailwind 基础样式
│  │  └─ globals.css
│  ├─ lib/
│  │  ├─ tauri.ts                         对 invoke 的封装与错误规范化
│  │  └─ fonts.ts                         前端字体数据与筛选逻辑
│  ├─ types/
│  │  └─ fonts.ts                         FontFamily / FontVariant / 枚举等
│  ├─ components/
│  │  ├─ FontFamilyCard.tsx               家族卡片
│  │  ├─ FontVariantRow.tsx               变体行与预览控件
│  │  ├─ PreviewPane.tsx                  预览面板（字号、字重、样式）
│  │  ├─ InstallDropzone.tsx              拖拽/选择安装
│  │  ├─ SearchBar.tsx                    搜索与筛选 UI
│  │  └─ ThemeToggle.tsx                  深色/浅色模式切换
│  └─ pages/
│     └─ FontsPage.tsx                    主界面，家族列表 + 预览 + 筛选
├─ src-tauri/
│  ├─ src/
│  │  ├─ lib.rs                           Tauri 入口与命令注册
│  │  ├─ fonts/
│  │  │  ├─ mod.rs
│  │  │  ├─ enumerate.rs                  列举系统字体
│  │  │  ├─ install.rs                    安装字体
│  │  │  └─ uninstall.rs                  卸载字体
│  │  └─ win/
│  │     └─ registry.rs                   Windows 注册表操作辅助
│  ├─ Cargo.toml                          Rust 依赖
│  ├─ capabilities/
│  │  ├─ default.json
│  │  └─ dialog.json                      文件对话框权限（如采用插件）
│  └─ tauri.conf.json                     Tauri 配置与打包设置
└─ docs/
   └─ implementation-path.md              本文件
```

## 4. TypeScript 数据模型（前端）
```ts
// src/types/fonts.ts
export type FontWeight =
  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type FontStyle = 'normal' | 'italic';

export interface FontVariant {
  id: string;
  family: string;
  style: FontStyle;
  weight: FontWeight;
  path: string;
  postscriptName?: string;
  fullName?: string;
  isSystemCore?: boolean;
}

export interface FontFamily {
  family: string;
  variants: FontVariant[];
}

export interface ListFontsResult {
  families: FontFamily[];
  totalFamilies: number;
  totalVariants: number;
}
```

## 5. Rust 命令接口（后端）
- `list_fonts() -> ListFontsResult`：枚举系统中可用字体，解析家族名、字重、样式与路径。
- `install_fonts(paths: Vec<String>, scope: InstallScope) -> InstallResult`：安装传入的字体文件，支持用户级与机器级。
- `uninstall_font(variant_id: String, scope: InstallScope) -> UninstallResult`：卸载单个变体。
- `uninstall_family(family: String, scope: InstallScope) -> UninstallResult`：卸载整个家族。

返回结构与错误通过 `serde` 序列化，确保与前端类型定义一致。错误统一封装为具备可读 `code` 与 `message` 的对象，前端据此展示提示。

## 6. 字体读取与解析策略（Windows）
- 枚举策略：
  - 使用 `fontdb` 加载系统字体数据库获取家族与变体；必要时补充扫描 `%WINDIR%\\Fonts` 及 `%LOCALAPPDATA%\\Microsoft\\Windows\\Fonts`。
  - 对每个字体文件，解析元数据以得到 `family`、`weight`、`style`、`postscript` 与 `fullName`，并生成稳定 `id`（如 `sha1(path+psname)`）。
- 归类规则：
  - 同一 `family` 下按 `weight` 与 `style` 分组，顺序优先显示常见权重 400、700。
  - 标记系统核心字体（黑名单或白名单，如 `Segoe UI` 系列）以防误删。

## 7. 安装与卸载实现要点
- 安装位置与权限：
  - 优先提供用户级安装 `%LOCALAPPDATA%\\Microsoft\\Windows\\Fonts`，无需管理员权限。
  - 机器级安装至 `%WINDIR%\\Fonts`，需要管理员权限与相应注册表写入。
- 注册表键：
  - 用户级：`HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts`
  - 机器级：`HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts`
- 过程：
  - 验证文件扩展名 `.ttf/.otf`，复制到目标目录。
  - 在对应注册表键下写入条目，名称可取 `FullName (TrueType)`，值为文件名。
  - 刷新字体缓存，通知系统字体表变化（广播 `WM_FONTCHANGE`）。
- 卸载：
  - 从注册表删除条目，删除目标目录中的文件（若不再被其他注册表条目引用）。
  - 对家族卸载时，批量处理该家族所有变体。
- 错误处理：
  - 权限不足、文件占用、无效字体、重复安装等错误分类返回。

## 8. 前端 UI 与交互
- 布局：
  - 左侧搜索与筛选栏，中间字体家族卡片列表，右侧预览面板。
  - 响应式：宽屏三栏，窄屏切换面板或折叠。
- 组件：
  - `FontFamilyCard`：家族名、展开/收起、变体列表，过渡动画。
  - `FontVariantRow`：选择框、权重/样式标签、操作按钮。
  - `PreviewPane`：输入文本、字号滑杆、字重选择、斜体开关。
  - `InstallDropzone`：拖拽或按钮选择文件，展示选中文件与进度。
  - `SearchBar`：名称关键字、权重范围、样式过滤。
  - `ThemeToggle`：遵循系统主题，支持手动切换。
- 反馈：
  - 使用 shadcn/ui 的 `Dialog` 或 `Toast` 提示安装/卸载成功或失败。

## 9. 调用封装与类型安全
- `src/lib/tauri.ts` 封装 `invoke`，提供以下函数：
  - `listFonts(): Promise<ListFontsResult>`
  - `installFonts(paths: string[], scope: 'user'|'machine'): Promise<void>`
  - `uninstallFont(variantId: string, scope: 'user'|'machine'): Promise<void>`
  - `uninstallFamily(family: string, scope: 'user'|'machine'): Promise<void>`
- 所有返回值与错误均通过 TypeScript 类型约束，组件只与类型化函数交互。

## 10. Tauri 配置与权限
- `src-tauri/tauri.conf.json`：
  - 窗口最小尺寸设置为 800×600，标题与图标更新为产品信息。
  - `bundle` 配置保持默认，Windows 打包为可执行安装包；后续根据需要设置安装模式（用户级/机器级）。
- Capabilities：
  - 默认 `core:default` 足够调用 Rust 命令。
  - 如需原生文件选择，可添加 dialog 插件能力文件并在前端使用相应 API。
- 管理员权限：
  - 用户级安装默认不需要管理员权限。
  - 机器级安装需在安装器层面启用提升权限选项，并在运行时对失败进行降级提示或引导重新以管理员身份运行。

## 11. 依赖与集成
- Rust 依赖：
  - `fontdb`：字体数据库与元信息解析。
  - `ttf-parser`：必要时对字体文件进行更细粒度解析。
  - `windows` 或 `winapi`：注册表、消息广播与系统目录路径。
  - `serde`、`serde_json`：序列化。
- 前端依赖：
  - `tailwindcss`、`postcss`、`autoprefixer`。
  - `class-variance-authority`、`clsx`、`tailwind-merge`（随 shadcn/ui 推荐）。
  - `@radix-ui/react-*` 与 `shadcn/ui` 模板安装脚本。

## 12. 渐进式里程碑
1) 环境与样式
   - 集成 Tailwind 与 shadcn/ui，建立主题与基础组件库。
   - 设置窗口最小尺寸、标题与图标。
2) 字体枚举
   - 添加 Rust 依赖与 `list_fonts` 命令，实现系统字体扫描与 JSON 返回。
   - 前端数据模型与列表展示，完成分组与展开交互。
3) 预览面板
   - 实现动态字号、字重与样式切换的实时预览。
4) 安装功能
   - 拖拽/选择安装流程，用户级安装打通，错误反馈与进度提示。
5) 卸载功能
   - 单变体与家族卸载，核心字体保护，错误分类提示。
6) 搜索与筛选
   - 名称关键字、字重、样式多条件过滤，类型安全实现。
7) 打包与权限
   - 验证用户级与机器级安装路径，配置安装器的权限与安装范围。
8) 测试与稳定
   - 编写 Rust 单元测试与前端筛选逻辑测试，补充端到端冒烟测试。

## 13. 关键实现细节（摘要）
- 字重映射：将 OS/2 weight class 映射到 100–900 标准权重。
- 变体标识：使用 `postscriptName` 优先，否则以 `family + weight + style + path` 组合。
- 系统字体保护：维护一份可配置列表，前端禁用卸载按钮，后端再次校验。
- 性能与缓存：首次加载后在内存缓存字体索引，必要时提供手动刷新。

## 14. 测试策略
- Rust：
  - 单元：解析器、注册表读写模拟、路径处理。
  - 集成：在临时目录与测试注册表根下模拟安装/卸载。
- 前端：
  - 单元：筛选与归类纯函数。
  - 组件：预览与列表交互渲染测试。
  - 冒烟：打包后在 Windows 上进行安装/卸载全流程验证。

## 15. 验收标准
- 列出系统字体并正确分组展示，搜索与筛选准确。
- 预览实时生效，字号与字重切换无明显卡顿。
- 安装/卸载返回明确结果与错误分类，核心字体不可误删。
- 在无管理员权限下完成用户级安装，在管理员权限下支持机器级安装。
- 通过 `npm run tauri build` 成功打包并可在目标 Windows 环境安装运行。

## 16. 后续扩展
- 字体冲突检测与覆盖策略。
- 字体文件校验与签名信息展示。
- 家族级预设预览文本与收藏夹。
- 批量操作队列与回滚。

---

本实现路径严格遵循 Tauri v2 能力与安全模型，确保前后端类型一致与权限边界清晰，优先落地用户级操作并在需要时提升权限，实现稳健的 Windows 字体管理体验。

