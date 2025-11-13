#!/bin/bash

# SQL Analyzer Pre-commit Hook Installer
# 这个脚本用于安装pre-commit钩子到项目中

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在git仓库中
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print_error "当前目录不是Git仓库"
        exit 1
    fi
}

# 检查sql-analyzer是否已安装
check_sql_analyzer() {
    if ! command -v sql-analyzer &> /dev/null; then
        print_warning "sql-analyzer未全局安装"
        
        # 检查是否是当前项目
        if [ -f "./bin/cli.js" ] && [ -f "./package.json" ]; then
            print_info "检测到当前是sql-analyzer项目，使用本地版本"
            ANALYZER_PATH="$(pwd)/bin/cli.js"
        else
            print_error "请先安装sql-analyzer: bun install -g ."
            exit 1
        fi
    else
        ANALYZER_PATH="sql-analyzer"
    fi
}

# 创建pre-commit钩子
create_pre_commit_hook() {
    local hooks_dir=".git/hooks"
    local pre_commit_file="$hooks_dir/pre-commit"
    
    # 确保hooks目录存在
    mkdir -p "$hooks_dir"
    
    # 创建pre-commit钩子
    cat > "$pre_commit_file" << EOF
#!/bin/bash
# SQL Analyzer Pre-commit Hook
# 自动生成的钩子，请勿手动修改

# 获取脚本所在目录
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# 检查是否跳过SQL检查
skip_check=false
for arg in "\$@"; do
    if [ "\$arg" = "--no-verify" ] || [ "\$arg" = "-n" ]; then
        skip_check=true
        break
    fi
done

# 获取提交消息
commit_msg=""
if [ -f ".git/COMMIT_EDITMSG" ]; then
    commit_msg=\$(cat .git/COMMIT_EDITMSG)
fi

# 检查是否跳过
if [[ "\$commit_msg" == *"[skip-sql-check]"* ]]; then
    echo "跳过SQL检查 ([skip-sql-check] 在提交消息中)"
    exit 0
fi

# 获取暂存的SQL文件
sql_files=\$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.sql$' || true)

if [ -z "\$sql_files" ]; then
    echo "没有检测到SQL文件变更，跳过检查"
    exit 0
fi

echo "发现 \$(echo "\$sql_files" | wc -l) 个SQL文件需要检查:"
echo "\$sql_files" | sed 's/^/  - /'

# 分析结果
has_errors=false

# 逐个分析文件
for file in \$sql_files; do
    echo "正在分析: \$file"
    
    # 执行SQL分析
    if ! $ANALYZER_PATH analyze -f "\$file" 2>/dev/null; then
        echo "❌ \$file: 分析失败"
        has_errors=true
    else
        echo "✅ \$file: 分析通过"
    fi
done

# 输出汇总
echo ""
echo "=== SQL分析汇总 ==="
if [ "\$has_errors" = true ]; then
    echo "❌ SQL分析发现问题，提交已被阻止"
    echo ""
    echo "提示:"
    echo "  1. 修复上述问题后再次尝试提交"
    echo "  2. 或者在提交消息中包含 [skip-sql-check] 跳过检查"
    echo "  3. 或者使用 bun install -g . 进行全局安装以提高性能"
    exit 1
else
    echo "✅ 所有SQL文件检查通过，可以提交"
    exit 0
fi
EOF

    # 设置执行权限
    chmod +x "$pre_commit_file"
    
    print_success "pre-commit钩子已创建: $pre_commit_file"
}

# 创建配置文件
create_config_file() {
    local config_file=".sql-analyzer.json"
    
    # 如果配置文件已存在，询问是否覆盖
    if [ -f "$config_file" ]; then
        read -p "配置文件 $config_file 已存在，是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "跳过配置文件创建"
            return
        fi
    fi
    
    # 创建配置文件
    cat > "$config_file" << EOF
{
  "databaseType": "mysql",
  "analysisDimensions": ["performance", "security", "standards"],
  "allowSkip": true,
  "verbose": true,
  "sqlExtensions": [".sql"],
  "excludePaths": ["node_modules", ".git", "dist", "build"]
}
EOF
    
    print_success "配置文件已创建: $config_file"
}

# 主函数
main() {
    print_info "安装SQL Analyzer Pre-commit Hook..."
    
    # 检查Git仓库
    check_git_repo
    
    # 检查sql-analyzer
    check_sql_analyzer
    
    # 创建pre-commit钩子
    create_pre_commit_hook
    
    # 创建配置文件
    create_config_file
    
    print_success "SQL Analyzer Pre-commit Hook安装完成!"
    echo ""
    print_info "使用方法:"
    echo "  1. 正常提交: git commit -m 'feat: add new feature'"
    echo "  2. 跳过检查: git commit -m 'feat: add new feature [skip-sql-check]'"
    echo "  3. 临时跳过: git commit --no-verify -m 'feat: add new feature'"
    echo ""
    print_info "配置文件: .sql-analyzer.json"
}

# 运行主函数
main "\$@"