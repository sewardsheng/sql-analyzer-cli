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

# 默认配置
DEFAULT_SCORE_THRESHOLD=70
DEFAULT_BLOCK_ON_CRITICAL=true
DEFAULT_ENABLE_JSON_OUTPUT=true

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
        if [ -f "./src/index.js" ] && [ -f "./package.json" ]; then
            print_info "检测到当前是sql-analyzer项目，使用本地版本"
            ANALYZER_PATH="bun run $(pwd)/src/index.js"
        else
            print_error "请先安装sql-analyzer: bun install -g ."
            exit 1
        fi
    else
        ANALYZER_PATH="sql-analyzer"
    fi
}

# 读取用户配置
read_user_config() {
    print_info "配置CI/CD设置 (直接回车使用默认值):"
    
    read -p "评分阈值 (0-100, 默认: $DEFAULT_SCORE_THRESHOLD): " user_threshold
    SCORE_THRESHOLD=${user_threshold:-$DEFAULT_SCORE_THRESHOLD}
    
    read -p "是否启用严重问题阻止提交? (y/N, 默认: $DEFAULT_BLOCK_ON_CRITICAL): " user_block
    BLOCK_ON_CRITICAL=${user_block:-$DEFAULT_BLOCK_ON_CRITICAL}
    
    read -p "是否启用JSON输出格式? (Y/n, 默认: $DEFAULT_ENABLE_JSON_OUTPUT): " user_json
    ENABLE_JSON_OUTPUT=${user_json:-$DEFAULT_ENABLE_JSON_OUTPUT}
    
    # 转换布尔值
    if [[ "$BLOCK_ON_CRITICAL" =~ ^[Yy]$ ]]; then
        BLOCK_ON_CRITICAL=true
    else
        BLOCK_ON_CRITICAL=false
    fi
    
    if [[ "$ENABLE_JSON_OUTPUT" =~ ^[Nn]$ ]]; then
        ENABLE_JSON_OUTPUT=false
    else
        ENABLE_JSON_OUTPUT=true
    fi
    
    print_success "配置完成: 阈值=$SCORE_THRESHOLD, 阻塞=$BLOCK_ON_CRITICAL, JSON=$ENABLE_JSON_OUTPUT"
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

# CI/CD配置
SCORE_THRESHOLD=$SCORE_THRESHOLD
BLOCK_ON_CRITICAL=$BLOCK_ON_CRITICAL
ENABLE_JSON_OUTPUT=$ENABLE_JSON_OUTPUT

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

echo "🔍 SQL Analyzer Pre-commit Hook"
echo "发现 \$(echo "\$sql_files" | wc -l) 个SQL文件需要检查:"
echo "\$sql_files" | sed 's/^/  - /'

# 分析结果
has_errors=false
has_blocking=false
has_score_failures=false

# 逐个分析文件
for file in \$sql_files; do
    echo ""
    echo "🔍 正在分析: \$file"
    
    # 构建分析命令
    cmd="$ANALYZER_PATH analyze -f \"\$file\" --quick --cicd-mode"
    
    # 执行SQL分析
    if output=\$($cmd 2>&1); then
        # 解析JSON输出（如果启用）
        if [ "$ENABLE_JSON_OUTPUT" = "true" ]; then
            # 尝试解析JSON输出
            if echo "\$output" | jq -e '.status' >/dev/null 2>&1; then
                status=\$(echo "\$output" | jq -r '.status')
                score=\$(echo "\$output" | jq -r '.score // 0')
                has_blocking_issue=\$(echo "\$output" | jq -r '.hasBlocking // false')
                
                if [ "\$status" = "fail" ]; then
                    has_errors=true
                    if [ "\$has_blocking_issue" = "true" ]; then
                        has_blocking=true
                        echo "🚫 \$file: 发现阻塞性问题 (评分: \$score)"
                    elif [ "\$score" -lt "\$SCORE_THRESHOLD" ]; then
                        has_score_failures=true
                        echo "⚠️  \$file: 评分不足 (\$score/\$SCORE_THRESHOLD)"
                    else
                        echo "❌ \$file: 分析失败"
                    fi
                else
                    echo "✅ \$file: 分析通过 (评分: \$score)"
                fi
            else
                # JSON解析失败，使用传统检查
                if echo "\$output" | grep -q "❌"; then
                    has_errors=true
                    echo "❌ \$file: 分析发现问题"
                else
                    echo "✅ \$file: 分析通过"
                fi
            fi
        else
            # 传统输出检查
            if echo "\$output" | grep -q "❌"; then
                has_errors=true
                echo "❌ \$file: 分析发现问题"
            else
                echo "✅ \$file: 分析通过"
            fi
        fi
    else
        echo "❌ \$file: 分析执行失败"
        has_errors=true
    fi
done

# 输出汇总
echo ""
echo "=== SQL分析汇总 ==="
passed_files=\$(echo "\$sql_files" | wc -l)
failed_files=0

if [ "\$has_errors" = true ]; then
    echo "❌ SQL分析发现问题，提交已被阻止"
    echo ""
    echo "📋 配置信息:"
    echo "  - 评分阈值: \$SCORE_THRESHOLD"
    echo "  - 阻塞性问题检查: \$BLOCK_ON_CRITICAL"
    echo "  - JSON输出: \$ENABLE_JSON_OUTPUT"
    echo ""
    echo "💡 提示:"
    echo "  1. 修复上述问题后再次尝试提交"
    echo "  2. 或者在提交消息中包含 [skip-sql-check] 跳过检查"
    echo "  3. 或者使用 git commit --no-verify 跳过检查"
    echo "  4. 重新运行: bash scripts/install-pre-commit.sh 更新配置"
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
  "excludePaths": ["node_modules", ".git", "dist", "build"],
  "cicd": {
    "quickMode": true,
    "scoreThreshold": $SCORE_THRESHOLD,
    "blockOnCritical": $BLOCK_ON_CRITICAL,
    "enableJsonOutput": $ENABLE_JSON_OUTPUT,
    "quickModeWeights": {
      "security": 0.50,
      "performance": 0.30,
      "standards": 0.20
    }
  }
}
EOF
    
    print_success "配置文件已创建: $config_file"
}

# 创建环境配置文件
create_env_file() {
    local env_file=".env"
    
    # 如果.env文件已存在，询问是否添加CI/CD配置
    if [ -f "$env_file" ]; then
        if grep -q "CICD_" "$env_file"; then
            print_info "CI/CD配置已存在于 $env_file"
            return
        fi
        
        read -p "是否在 $env_file 中添加CI/CD配置? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo "" >> "$env_file"
            echo "# CI/CD 快速模式配置" >> "$env_file"
            echo "CICD_QUICK_MODE=true" >> "$env_file"
            echo "CICD_SCORE_THRESHOLD=$SCORE_THRESHOLD" >> "$env_file"
            echo "CICD_BLOCK_ON_CRITICAL=$BLOCK_ON_CRITICAL" >> "$env_file"
            echo "CICD_ENABLE_JSON_OUTPUT=$ENABLE_JSON_OUTPUT" >> "$env_file"
            print_success "CI/CD配置已添加到 $env_file"
        fi
    else
        print_warning "$env_file 文件不存在，跳过环境配置"
    fi
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    # 检查jq（用于JSON解析）
    if ! command -v jq &> /dev/null; then
        if [ "$ENABLE_JSON_OUTPUT" = "true" ]; then
            print_warning "jq未安装，JSON输出功能可能无法正常工作"
            print_info "安装jq: brew install jq (macOS) 或 apt-get install jq (Ubuntu)"
        fi
    fi
    
    # 检查bun
    if ! command -v bun &> /dev/null; then
        if [[ "$ANALYZER_PATH" == *"bun"* ]]; then
            print_error "bun未安装，无法使用本地版本"
            print_info "安装bun: curl -fsSL https://bun.sh/install | bash"
            exit 1
        fi
    fi
    
    print_success "依赖检查完成"
}

# 主函数
main() {
    print_info "🚀 安装SQL Analyzer Pre-commit Hook..."
    echo ""
    
    # 检查Git仓库
    check_git_repo
    
    # 检查sql-analyzer
    check_sql_analyzer
    
    # 读取用户配置
    read_user_config
    echo ""
    
    # 检查依赖
    check_dependencies
    echo ""
    
    # 创建pre-commit钩子
    create_pre_commit_hook
    echo ""
    
    # 创建配置文件
    create_config_file
    echo ""
    
    # 创建环境配置文件
    create_env_file
    echo ""
    
    print_success "🎉 SQL Analyzer Pre-commit Hook安装完成!"
    echo ""
    print_info "📋 使用方法:"
    echo "  1. 正常提交: git commit -m 'feat: add new feature'"
    echo "  2. 跳过检查: git commit -m 'feat: add new feature [skip-sql-check]'"
    echo "  3. 临时跳过: git commit --no-verify -m 'feat: add new feature'"
    echo ""
    print_info "⚙️  配置信息:"
    echo "  - 评分阈值: $SCORE_THRESHOLD"
    echo "  - 阻塞性问题检查: $BLOCK_ON_CRITICAL"
    echo "  - JSON输出: $ENABLE_JSON_OUTPUT"
    echo ""
    print_info "📁 配置文件:"
    echo "  - 项目配置: .sql-analyzer.json"
    echo "  - 环境配置: .env"
    echo ""
    print_info "🔄 更新配置: 重新运行此脚本即可更新配置"
}

# 运行主函数
main "\$@"