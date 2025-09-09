# TVBox安全配置指南

## 🔒 安全问题
TVBox的JSON接口默认无鉴权，可能被他人滥用。现已添加多种可选的安全机制。

## 🛠️ 安全选项

### 1. Token鉴权（推荐）
通过URL参数添加token验证：

**环境变量配置：**
```bash
ENABLE_TVBOX_AUTH=true
TVBOX_TOKEN=你的专用token  # 可选，不设置则使用PASSWORD
```

**使用方式：**
- 无鉴权：`https://your-domain.com/api/tvbox`
- 有鉴权：`https://your-domain.com/api/tvbox?token=你的token`
- Base64格式：`https://your-domain.com/api/tvbox?format=base64&token=你的token`

### 2. IP白名单
限制只允许特定IP访问：

**环境变量配置：**
```bash
ENABLE_TVBOX_IP_WHITELIST=true
TVBOX_ALLOWED_IPS=192.168.1.100,10.0.0.50,*  # 逗号分隔，*表示允许所有
```

### 3. 访问频率限制
防止频繁访问滥用：

**环境变量配置：**
```bash
ENABLE_TVBOX_RATE_LIMIT=true
TVBOX_RATE_LIMIT=60  # 每分钟最多60次请求
```

## 📱 TVBox配置示例

### 无安全限制（默认）
```
https://your-domain.com/api/tvbox
```

### 启用Token验证
```
https://your-domain.com/api/tvbox?token=mySecretToken123
```

### 完整配置示例
在你的`.env`文件中添加：
```bash
# TVBox安全配置
ENABLE_TVBOX_AUTH=true
TVBOX_TOKEN=myTvboxToken2025
ENABLE_TVBOX_IP_WHITELIST=true
TVBOX_ALLOWED_IPS=192.168.1.0/24,10.0.0.0/24
ENABLE_TVBOX_RATE_LIMIT=true
TVBOX_RATE_LIMIT=30
```

## 💡 使用建议

### 家庭使用
```bash
# 只需要token验证即可
ENABLE_TVBOX_AUTH=true
TVBOX_TOKEN=家庭专用token
```

### 公网部署
```bash
# 建议开启所有安全机制
ENABLE_TVBOX_AUTH=true
TVBOX_TOKEN=复杂的随机token
ENABLE_TVBOX_RATE_LIMIT=true
TVBOX_RATE_LIMIT=30
```

### 内网使用
```bash
# 可以只用IP白名单
ENABLE_TVBOX_IP_WHITELIST=true
TVBOX_ALLOWED_IPS=192.168.1.0/24
```

## ⚠️ 注意事项

1. **TVBox兼容性**：所有安全机制都是可选的，默认保持无鉴权兼容TVBox
2. **Token安全**：token一旦设置，需要在TVBox中配置完整URL才能访问
3. **IP白名单**：适合固定网络环境，移动设备可能IP变化
4. **频率限制**：防止暴力访问，正常使用不会触发
5. **组合使用**：可以同时启用多种安全机制

## 🔧 故障排除

### TVBox无法加载配置
1. 检查URL是否包含正确的token参数
2. 确认IP是否在白名单中
3. 检查是否触发频率限制（等待1分钟后重试）

### 错误信息说明
- `Invalid token`：token不正确或缺失
- `Access denied for IP`：IP不在白名单中
- `Rate limit exceeded`：访问频率过高

## 📊 监控建议

可以在服务器日志中查看：
- 访问IP地址
- 访问频率
- 鉴权失败次数

这些信息有助于发现异常访问模式。