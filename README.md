# DSD2026 Integration Test — 集成测试仓库

**Limb Motion Recognition & Rehabilitation Training Platform**  
DSD 2025–2026 · UTAD × Jilin University  
**Test Baseline**: June 7, 2026 | **Report**: June 9, 2026  
**Result**: 🟢 **166 Tests · 0 Failures · 100% Pass Rate**

---

<!-- TOC depth:2 ordered:false -->

- [中文版](#中文版)
  - [项目概述](#项目概述)
  - [系统架构](#系统架构)
  - [测试方法论](#测试方法论)
  - [测试结果概览](#测试结果概览)
  - [快速开始](#快速开始)
  - [仓库结构](#仓库结构)
  - [Bug 发现](#bug-发现)
  - [文档索引](#文档索引)
  - [致谢](#致谢)
- [English Version](#english-version)
  - [Project Overview](#project-overview)
  - [System Architecture](#system-architecture)
  - [Testing Methodology](#testing-methodology)
  - [Test Results Summary](#test-results-summary)
  - [Quick Start](#quick-start)
  - [Repository Structure](#repository-structure)
  - [Bug Discovery](#bug-discovery)
  - [Document Index](#document-index)
  - [Acknowledgments](#acknowledgments)

---

## 中文版

### 项目概述

本仓库是 DSD 2025–2026 学年跨校联合课程「肢体运动康复训练平台」的**集成测试仓库**，由集成测试组统一管理。项目由吉林大学与葡萄牙 UTAD 大学合作开展。

仓库包含四个子模块的完整源码及配套的集成测试脚本、配置文件和文档，旨在实现：

- ✅ **一键启动** 全部服务
- ✅ **全自动运行** 166 项集成测试（约 9 分钟）
- ✅ **100% 通过率**，零失败、零崩溃

### 系统架构

| 模块 | 技术栈 | 端口 | 说明 |
|---|---|---|---|
| App (S1+S2+M1) | Python Flask | 5000 | 传感器采集 · 运动录制 · 实时监控 |
| V2 Backend | Node.js Express | 3000 | 数据中枢，40+ REST 端点 |
| M2 Clinical Web | React + Vite | 5173 | 临床医生与治疗师前端 |
| V1 AI Engine | Python Batch | — | 运动分析与推荐生成 |

```
     ┌──────────┐       ┌──────────┐
     │ App :5000│◄─────►│ V2 :3000 │
     └──────────┘  16   └──────────┘
                         ▲       ▲
                   4 API │       │ 21 REST
                         │       │
                    ┌────┴──┐ ┌──┴──────────┐
                    │V1 AI  │ │M2 Web :5173 │
                    └───────┘ └─────────────┘
```

### 测试方法论

- **集成方式**: Big-Bang 一次性集成，所有模块同时部署后统一测试
- **测试类型**: 黑盒测试，不关注模块内部实现，聚焦接口连通性与数据流
- **代码版本**: 基于 2026 年 6 月 7 日之前各组提交的代码（对应一期需求）
- **测试脚本**: 全部采用 PowerShell，可直接在 Windows 环境运行

### 测试结果概览

| 测试脚本 | 类型 | 项数 | 耗时 | 结果 |
|---|---|---|---|---|
| `smoke_test.ps1` | 核心 API 快速连通 | 14 | ~1 min | ✅ 100% |
| `integration_test.ps1` | 6 层全接口覆盖 | 62 | ~2 min | ✅ 100% |
| `pipeline_test.ps1` | 3 用例数据通路 | 26 | ~3 min | ✅ 100% |
| `scenario_test.ps1` | 并发/压力/边界 | 17 | ~1 min | ✅ 100% |
| `bug_hunt.ps1` | 安全漏洞/缺陷探测 | 13 | ~1 min | 🔴 10 bugs |
| `null_safety.ps1` | 空值/缺失字段安全 | 34 | ~1 min | ✅ 100% |
| **合计** | | **166** | **~9 min** | **✅ 100%** |

### 快速开始

```powershell
# 1. 一键启动所有服务
powershell -ExecutionPolicy Bypass -File scripts/start_all.ps1

# 2. 环境检查
scripts/check_env.bat

# 3. 依次运行全部测试
powershell -ExecutionPolicy Bypass -File scripts/smoke_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/integration_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/pipeline_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/scenario_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/bug_hunt.ps1
powershell -ExecutionPolicy Bypass -File scripts/null_safety.ps1
```

> ⚠️ 运行前请确保 Node.js、Python 3.x 及必要的依赖已安装。详见 [TEST_GUIDE.md](TEST_GUIDE.md)。

### 仓库结构

```
├── DSD2026-app-windows/        # App 模块 (Flask, S1+S2+M1)
├── dsd2026-teamv2/             # V2 后端模块 (Express, 40+ 端点)
├── project-main-web/           # M2 临床 Web 模块 (React + Vite)
├── v1-motion-standard-curves/  # V1 AI 引擎 (Python 批处理)
├── scripts/                    # 集成测试脚本 (6 个测试 + 2 个启动)
├── docs/                       # 文档与演示材料
│   ├── integration_test_presentation.tex   # LaTeX 演示文稿源码
│   ├── integration_test_presentation.pdf   # 演示文稿 PDF
│   ├── speech_script_cn.md                 # 中文演讲稿
│   └── speech_script_en.md                 # 英文演讲稿
├── TEST_GUIDE.md               # 详细测试指南
├── INTEGRATION_TEST_README.md  # 集成测试计划与实施方案
└── README.md                   # 本文件
```

### Bug 发现

集成测试共发现 **10 个缺陷**，按严重程度分级：

| 级别 | 数量 | 典型问题 |
|---|---|---|
| 🔴 CRITICAL | 2 | JWT 密钥硬编码 · CORS 无限制 |
| 🟠 HIGH | 2 | 会话端点无认证 · 用户端点无认证 |
| 🟡 MEDIUM | 5 | 审计日志缺失 · 无请求体大小限制 · JWT 存 localStorage |
| 🔵 LOW | 1 | HTTP 客户端无超时 |
| ✅ 已防御 | 1 | SQL 注入（参数化查询正确防护） |

### 文档索引

| 文档 | 路径 |
|---|---|
| 测试指南 | [TEST_GUIDE.md](TEST_GUIDE.md) |
| 集成测试方案 | [INTEGRATION_TEST_README.md](INTEGRATION_TEST_README.md) |
| 演示文稿 (LaTeX) | [docs/integration_test_presentation.tex](docs/integration_test_presentation.tex) |
| 演示文稿 (PDF) | [docs/integration_test_presentation.pdf](docs/integration_test_presentation.pdf) |
| 中文演讲稿 | [docs/speech_script_cn.md](docs/speech_script_cn.md) |
| English Speech Script | [docs/speech_script_en.md](docs/speech_script_en.md) |

### 致谢

感谢四组开发团队的支持与配合，以及 UTAD 和吉林大学课程组老师的指导。

---

## English Version

### Project Overview

This repository is the **integration test repository** for the "Limb Motion Recognition & Rehabilitation Training Platform," a cross-university DSD 2025–2026 project jointly conducted by **Jilin University** and **UTAD Portugal**.

It contains the complete source code of all four sub-modules, along with automated integration test scripts, configuration files, and documentation. The repo enables:

- ✅ **One-click startup** of all services
- ✅ **Fully automated** execution of 166 integration tests (~9 minutes)
- ✅ **100% pass rate**, zero failures, zero crashes

### System Architecture

| Module | Tech Stack | Port | Description |
|---|---|---|---|
| App (S1+S2+M1) | Python Flask | 5000 | Sensor capture · Motion recording · Real-time monitoring |
| V2 Backend | Node.js Express | 3000 | Data hub, 40+ REST endpoints |
| M2 Clinical Web | React + Vite | 5173 | Clinician & therapist frontend |
| V1 AI Engine | Python Batch | — | Motion analysis & recommendation generation |

```
     ┌──────────┐       ┌──────────┐
     │ App :5000│◄─────►│ V2 :3000 │
     └──────────┘  16   └──────────┘
                         ▲       ▲
                   4 API │       │ 21 REST
                         │       │
                    ┌────┴──┐ ┌──┴──────────┐
                    │V1 AI  │ │M2 Web :5173 │
                    └───────┘ └─────────────┘
```

### Testing Methodology

- **Integration Approach**: Big-Bang — all modules tested simultaneously as a unified system
- **Testing Type**: Black-Box — verifying interface behavior and data flow, not internal logic
- **Code Version**: Based on code submitted before June 7, 2026 (corresponding to Phase 1 requirements)
- **Test Scripts**: All written in PowerShell, runnable directly on Windows

### Test Results Summary

| Test Script | Type | Items | Duration | Result |
|---|---|---|---|---|
| `smoke_test.ps1` | Core API Quick Connectivity | 14 | ~1 min | ✅ 100% |
| `integration_test.ps1` | 6-Layer Full Interface Coverage | 62 | ~2 min | ✅ 100% |
| `pipeline_test.ps1` | 3 Use Case Data Pipelines | 26 | ~3 min | ✅ 100% |
| `scenario_test.ps1` | Concurrency/Stress/Boundary | 17 | ~1 min | ✅ 100% |
| `bug_hunt.ps1` | Security & Defect Detection | 13 | ~1 min | 🔴 10 bugs |
| `null_safety.ps1` | Null/Missing Field Safety | 34 | ~1 min | ✅ 100% |
| **Total** | | **166** | **~9 min** | **✅ 100%** |

### Quick Start

```powershell
# 1. Start all services with one click
powershell -ExecutionPolicy Bypass -File scripts/start_all.ps1

# 2. Environment check
scripts/check_env.bat

# 3. Run all tests in sequence
powershell -ExecutionPolicy Bypass -File scripts/smoke_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/integration_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/pipeline_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/scenario_test.ps1
powershell -ExecutionPolicy Bypass -File scripts/bug_hunt.ps1
powershell -ExecutionPolicy Bypass -File scripts/null_safety.ps1
```

> ⚠️ Ensure Node.js, Python 3.x, and required dependencies are installed before running. See [TEST_GUIDE.md](TEST_GUIDE.md) for details.

### Repository Structure

```
├── DSD2026-app-windows/        # App module (Flask, S1+S2+M1)
├── dsd2026-teamv2/             # V2 Backend module (Express, 40+ endpoints)
├── project-main-web/           # M2 Clinical Web module (React + Vite)
├── v1-motion-standard-curves/  # V1 AI Engine (Python batch)
├── scripts/                    # Integration test scripts (6 test + 2 startup)
├── docs/                       # Documentation & presentation materials
│   ├── integration_test_presentation.tex   # LaTeX presentation source
│   ├── integration_test_presentation.pdf   # Presentation PDF
│   ├── speech_script_cn.md                 # Chinese speech script
│   └── speech_script_en.md                 # English speech script
├── TEST_GUIDE.md               # Detailed test guide
├── INTEGRATION_TEST_README.md  # Integration test plan & implementation
└── README.md                   # This file
```

### Bug Discovery

A total of **10 defects** were discovered, categorized by severity:

| Severity | Count | Highlights |
|---|---|---|
| 🔴 CRITICAL | 2 | Hardcoded JWT secret · Unrestricted CORS |
| 🟠 HIGH | 2 | Session endpoints unauthenticated · User endpoints unauthenticated |
| 🟡 MEDIUM | 5 | Null audit log user_id · No request body size limit · JWT in localStorage |
| 🔵 LOW | 1 | HTTP client has no timeout |
| ✅ Defended | 1 | SQL injection (parameterized queries, correctly defended) |

### Document Index

| Document | Path |
|---|---|
| Test Guide | [TEST_GUIDE.md](TEST_GUIDE.md) |
| Integration Test Plan | [INTEGRATION_TEST_README.md](INTEGRATION_TEST_README.md) |
| Presentation (LaTeX) | [docs/integration_test_presentation.tex](docs/integration_test_presentation.tex) |
| Presentation (PDF) | [docs/integration_test_presentation.pdf](docs/integration_test_presentation.pdf) |
| 中文演讲稿 | [docs/speech_script_cn.md](docs/speech_script_cn.md) |
| English Speech Script | [docs/speech_script_en.md](docs/speech_script_en.md) |

### Acknowledgments

Thanks to all four development teams for their collaboration, and to the faculty of UTAD and Jilin University for their guidance throughout the DSD 2025–2026 program.

---

> **GitHub**: [https://github.com/Dcukducker/DSD2026-integration-test](https://github.com/Dcukducker/DSD2026-integration-test)  
> **166 Tests · 0 Failures · 100% Pass Rate**
