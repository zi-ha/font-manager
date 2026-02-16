# 字体管理器实施计划

本文档跟踪字体管理器项目的开发进度。

## 1. 项目初始化与基础设施
- [x] 初始化 React + TypeScript 的 Tauri v2 项目
- [x] 配置 Vite (`vite.config.ts` 配置 `@/` 路径别名)
- [x] 配置 Tailwind CSS (`tailwind.config.js`, `globals.css`)
- [x] 安装 `shadcn/ui` 依赖 (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` 等)
- [x] 建立项目目录结构 (`src/components`, `src/lib`, `src/types`, `src-tauri/src/fonts`)

## 2. 后端：核心字体逻辑 (Rust)
- [x] 添加 Rust 依赖 (`fontdb`, `winapi`, `serde`, `walkdir`, `winreg`)
- [x] 在 `fonts/mod.rs` 中定义数据结构 (`FontFamily`, `FontVariant`)
- [x] 在 `fonts/enumerate.rs` 中使用 `fontdb` 实现字体枚举 (`list_fonts`)
- [x] 在 `lib.rs` 中注册命令
- [x] 在 `fonts/install.rs` 中实现字体安装 (`install_fonts`)
    - [x] 文件复制逻辑 (用户范围 - `%LOCALAPPDATA%`)
    - [x] Windows 注册表更新逻辑
    - [x] 字体广播消息 (`WM_FONTCHANGE`)
- [x] 在 `fonts/uninstall.rs` 中实现字体卸载 (`uninstall_font`)
    - [x] 注册表清理
    - [x] 文件删除
- [x] 在 `fonts/enumerate.rs` 和 `fonts/enumerate.rs` 中实现系统字体保护 (防止删除 Windows 核心字体)

## 3. 前端：用户界面与逻辑
- [x] 定义 TypeScript 接口 (`types/fonts.ts`)
- [x] 创建 API 封装 (`lib/tauri.ts`)
- [x] 实现基本 UI 布局 (侧边栏, 主列表, 预览)
- [x] 创建 `FontFamilyCard` 组件 (带变体折叠面板)
- [x] 创建 `PreviewPane` 组件 (文本, 大小, 字重, 样式预览)
- [x] 实现搜索/过滤逻辑
- [x] 添加基础 UI 组件 (`Button`, `Input`, `Card`, `Badge`, `Accordion`, `Slider`, `ScrollArea`, `Dialog`, `DropdownMenu`, `Switch`, `Toast`, `AlertDialog`)
- [x] 实现 "安装字体" 功能 UI 组件 (`InstallArea.tsx`)
    - [x] 拖放区域组件 (基本实现)
    - [x] 安装进度反馈 (Dialog + 安装结果统计)
- [x] 实现 "卸载字体" 功能
    - [x] UI 中的删除按钮 (Hover 显示，仅限非系统字体)
    - [x] 确认对话框 (AlertDialog)
- [x] 添加主题切换 (深色/浅色模式支持)
- [x] 改进错误处理与用户反馈 (Toast/Alert)
- [x] 自定义标题栏与窗口控制 (隐藏系统标题栏)

## 4. 打包与配置
- [x] 配置 `tauri.conf.json`
    - [x] 窗口大小 (最小 800x600)
    - [ ] 应用标识符与版本
    - [ ] 权限/功能
- [ ] 验证构建过程 (`npm run tauri build`)
- [ ] 在 Windows 环境下测试

## 5. 测试与打磨
- [ ] Rust 字体解析的单元测试
- [ ] 安装/卸载流程的端到端测试
- [ ] UI 打磨 (动画, 响应式设计调整)
