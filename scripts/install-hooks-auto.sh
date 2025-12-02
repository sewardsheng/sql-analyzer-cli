#!/bin/bash
# 自动安装Git Hooks - 支持CI/CD环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
AUTO_MODE=false
INSTALL_BLOCKING=false
INSTALL_SIMPLE=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            AUTO_MODE=true
            INSTALL_BLOCKING=true
            shift
            ;;
        --blocking)
            INSTALL_BLOCKING=true
            shift
            ;;
        --simple)
            INSTALL_SIMPLE=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            echo "SQL Analyzer Git Hooks 自动安装器"
            echo ""
            echo "用法: $0 [--auto] [--blocking] [--simple] [--force] [--help]"
            echo ""
            echo "选项:"
            echo "  --auto      自动模式（默认安装blocking版本）"
            echo "  --blocking  安装阻断式pre-commit hook"
            echo "  --simple    安装简单版pre-commit hook"
            echo "  --force     强制覆盖现有hooks"
            echo "  --help      显示此帮助信息"
            echo ""
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔧 SQL Analyzer Git Hooks 自动安装器${NC}"
echo "================================"

# 检查Git仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ 错误: 未在Git仓库中执行${NC}"
    echo -e "${YELLOW}请在项目根目录中运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git仓库检查通过: $(pwd)${NC}"

# 创建hooks目录
HOOKS_DIR=".git/hooks"
mkdir -p "$HOOKS_DIR"

# 安装blocking hook
if [ "$INSTALL_BLOCKING" = true ] || [ "$AUTO_MODE" = true ]; then
    echo -e "\n${BLUE}📦 安装阻断式pre-commit hook...${NC}"

    SOURCE_HOOK="scripts/git-hooks/pre-commit-blocking"
    TARGET_HOOK="$HOOKS_DIR/pre-commit"

    if [ -f "$TARGET_HOOK" ] && [ "$FORCE" != true ]; then
        echo -e "${YELLOW}⚠️  pre-commit hook已存在${NC}"
        echo -e "${YELLOW}   使用 --force 参数强制覆盖${NC}"
    else
        # 复制hook文件
        cp "$SOURCE_HOOK" "$TARGET_HOOK"

        # 确保可执行权限
        chmod +x "$TARGET_HOOK"

        echo -e "${GREEN}✅ 阻断式pre-commit hook安装完成${NC}"
        echo -e "${BLUE}   功能: 检测到严重SQL问题时将阻止提交${NC}"
    fi
fi

# 安装simple hook
if [ "$INSTALL_SIMPLE" = true ]; then
    echo -e "\n${BLUE}📦 安装简单版pre-commit hook...${NC}"

    SOURCE_HOOK="scripts/git-hooks/pre-commit-simple"
    TARGET_HOOK="$HOOKS_DIR/pre-commit"

    if [ -f "$TARGET_HOOK" ] && [ "$FORCE" != true ]; then
        echo -e "${YELLOW}⚠️  pre-commit hook已存在${NC}"
        echo -e "${YELLOW}   使用 --force 参数强制覆盖${NC}"
    else
        # 复制hook文件
        cp "$SOURCE_HOOK" "$TARGET_HOOK"

        # 确保可执行权限
        chmod +x "$TARGET_HOOK"

        echo -e "${GREEN}✅ 简单版pre-commit hook安装完成${NC}"
        echo -e "${BLUE}   功能: 检查SQL安全问题但不阻止提交${NC}"
    fi
fi

# 创建package.json脚本
echo -e "\n${BLUE}📝 添加npm脚本...${NC}"

# 检查package.json是否存在
if [ -f "package.json" ]; then
    # 使用node.js添加脚本
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        pkg.scripts = pkg.scripts || {};
        pkg.scripts['install-hooks'] = 'bash scripts/install-hooks-auto.sh --blocking';
        pkg.scripts['install-simple-hooks'] = 'bash scripts/install-hooks-auto.sh --simple';

        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ npm脚本添加完成');
    "
else
    echo -e "${YELLOW}⚠️  package.json不存在，跳过npm脚本添加${NC}"
fi

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║        🎉 Hook安装完成！             ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📋 使用说明:${NC}"
echo ""
echo -e "${GREEN}1. 测试hook:${NC}"
echo "   git add ."
echo "   git commit -m \"test: test SQL security hook\""
echo ""
echo -e "${GREEN}2. 紧急跳过检查:${NC}"
echo "   git commit --no-verify -m \"emergency commit\""
echo ""
echo -e "${GREEN}3. 重新安装hooks:${NC}"
echo "   npm run install-hooks"
echo "   bash scripts/install-hooks-auto.sh --blocking"
echo ""
echo -e "${YELLOW}⚠️  注意: hook将在每次提交时自动运行，确保代码安全！${NC}"

exit 0