#!/bin/bash
# Git Hook安装脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 SQL Analyzer Git Hooks Installer${NC}"
echo ""

# 获取项目根目录
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$PROJECT_ROOT"

# Git hooks目录
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# 检查是否在Git仓库中
if [ ! -d "$HOOKS_DIR" ]; then
    echo -e "${RED}❌ Error: Not in a Git repository${NC}"
    echo "Please run this script from within a Git repository."
    exit 1
fi

echo -e "${BLUE}📁 Git repository found: $PROJECT_ROOT${NC}"
echo ""

# Hook选项
install_precommit=false
install_prepush=false
install_all=false
force=false

# 解析命令行参数
for arg in "$@"; do
    case $arg in
        --pre-commit)
            install_precommit=true
            ;;
        --pre-push)
            install_prepush=true
            ;;
        --all)
            install_all=true
            ;;
        --force)
            force=true
            ;;
        --help|-h)
            echo "Usage: $0 [--pre-commit] [--pre-push] [--all] [--force] [--help]"
            echo ""
            echo "Options:"
            echo "  --pre-commit  Install pre-commit hook"
            echo "  --pre-push     Install pre-push hook"
            echo "  --all          Install all available hooks"
            echo "  --force        Force overwrite existing hooks"
            echo "  --help         Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# 如果没有指定特定hooks，默认安装pre-commit
if [ "$install_all" = false ] && [ "$install_precommit" = false ] && [ "$install_prepush" = false ]; then
    install_precommit=true
fi

if [ "$install_all" = true ]; then
    install_precommit=true
    install_prepush=true
fi

# 创建hooks目录（如果不存在）
mkdir -p "$HOOKS_DIR"

echo -e "${BLUE}📋 Installing hooks:${NC}"
echo ""

# 安装pre-commit hook
if [ "$install_precommit" = true ]; then
    HOOK_FILE="$HOOKS_DIR/pre-commit"
    SOURCE_SCRIPT="scripts/git-hooks/pre-commit-simple"

    echo -e "  ${YELLOW}Installing pre-commit hook...${NC}"

    if [ -f "$HOOK_FILE" ] && [ "$force" = false ]; then
        echo -e "    ${RED}⚠️  Pre-commit hook already exists${NC}"
        echo -e "    ${BLUE}   Use --force to overwrite${NC}"

        read -p "    Overwrite existing pre-commit hook? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "    Skipping pre-commit hook installation"
        else
            force=true
        fi
    fi

    if [ "$force" = true ] || [ ! -f "$HOOK_FILE" ]; then
        if [ -f "scripts/git-hooks/pre-commit" ] && [ -f "scripts/git-hooks/pre-commit-simple" ]; then
            # 让用户选择完整版或简化版
            echo -e "    ${BLUE}Choose pre-commit hook type:${NC}"
            echo "    1) Full version (detailed output, interactive)"
            echo "    2) Simple version (fast, minimal output)"
            echo ""
            read -p "    Select (1/2) [2]: " -n 1 -r
            echo

            case $REPLY in
                1)
                    cp "scripts/git-hooks/pre-commit" "$HOOK_FILE"
                    echo -e "    ${GREEN}✅ Full pre-commit hook installed${NC}"
                    ;;
                *)
                    cp "scripts/git-hooks/pre-commit-simple" "$HOOK_FILE"
                    echo -e "    ${GREEN}✅ Simple pre-commit hook installed${NC}"
                    ;;
            esac
        elif [ -f "scripts/git-hooks/pre-commit-simple" ]; then
            cp "scripts/git-hooks/pre-commit-simple" "$HOOK_FILE"
            echo -e "    ${GREEN}✅ Pre-commit hook installed (simple version)${NC}"
        elif [ -f "scripts/git-hooks/pre-commit" ]; then
            cp "scripts/git-hooks/pre-commit" "$HOOK_FILE"
            echo -e "    ${GREEN}✅ Pre-commit hook installed (full version)${NC}"
        else
            echo -e "    ${RED}❌ Hook script not found${NC}"
        fi

        # 设置执行权限
        if [ -f "$HOOK_FILE" ]; then
            chmod +x "$HOOK_FILE"
        fi
    fi
fi

# 安装pre-push hook（如果存在）
if [ "$install_prepush" = true ]; then
    HOOK_FILE="$HOOKS_DIR/pre-push"
    SOURCE_SCRIPT="scripts/git-hooks/pre-push"

    echo -e "  ${YELLOW}Installing pre-push hook...${NC}"

    if [ -f "$HOOK_FILE" ] && [ "$force" = false ]; then
        echo -e "    ${RED}⚠️  Pre-push hook already exists${NC}"
        echo -e "    ${BLUE}   Use --force to overwrite${NC}"
    else
        # 创建简单的pre-push hook（扫描整个项目）
        cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# Pre-push hook for SQL Security Scan

set -e

echo "🔍 Pre-push SQL Security Check"

# 扫描整个项目的SQL文件
if [ -f "scripts/jenkins/sql-scan-simple.sh" ]; then
    ./scripts/jenkins/sql-scan-simple.sh
else
    # 简单扫描
    SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*" 2>/dev/null || echo "")
    if [ -n "$SQL_FILES" ]; then
        sql-analyzer analyze $SQL_FILES --format json > /dev/null 2>&1 || {
            echo "❌ SQL security check failed"
            exit 1
        }
        echo "✅ No critical SQL security issues found"
    fi
fi

echo "🚀 Ready to push"
EOF

        chmod +x "$HOOK_FILE"
        echo -e "    ${GREEN}✅ Pre-push hook installed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Git hooks installation completed!${NC}"
echo ""
echo -e "${BLUE}📋 Installed hooks:${NC}"

if [ "$install_precommit" = true ] && [ -f "$HOOKS_DIR/pre-commit" ]; then
    echo -e "  ${GREEN}✓${NC} Pre-commit hook"
fi

if [ "$install_prepush" = true ] && [ -f "$HOOKS_DIR/pre-push" ]; then
    echo -e "  ${GREEN}✓${NC} Pre-push hook"
fi

echo ""
echo -e "${BLUE}💡 Usage:${NC}"
echo "  - Hooks will run automatically when you run 'git commit' or 'git push'"
echo "  - To bypass hooks temporarily: git commit --no-verify"
echo "  - To uninstall hooks: rm .git/hooks/pre-commit .git/hooks/pre-push"
echo ""
echo -e "${GREEN}🔒 Your SQL code is now protected!${NC}"