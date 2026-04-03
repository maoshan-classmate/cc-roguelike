# JSON 转义函数

# 用途：在 bash 中构造 JSON 字符串时，对文本内容进行转义
# 使用：escaped=$(escape_for_json "$CONTENT")

escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"    # \ → \\
    s="${s//\"/\\\"}"    # " → \"
    s="${s//$'\n'/\\n}"  # 换行 → \n
    s="${s//$'\r'/\\r}"  # 回车 → \r
    s="${s//$'\t'/\\t}"  # 制表 → \t
    printf '%s' "$s"
}

# 使用示例：
# CONTENT="Hello\nWorld"
# escaped=$(escape_for_json "$CONTENT")
# printf '{"key":"%s"}\n' "$escaped"
