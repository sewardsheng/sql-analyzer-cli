# MongoDB 查询优化与 explain 命令

## 查询优化基础

### 查询优化原则

1. **减少数据访问量**
   - 只选择必要的字段，避免使用无限制的find()
   - 使用查询条件限制返回的文档数
   - 使用limit()限制结果集大小

2. **合理使用索引**
   - 为经常用于查询条件的字段创建索引
   - 为经常用于排序和分组的字段创建索引
   - 避免过度索引，因为索引会降低写操作性能

3. **优化关联操作**
   - 确保$lookup操作的关联字段有索引
   - 小集合驱动大集合原则
   - 合理使用$lookup的pipeline参数限制关联文档数量

4. **避免全集合扫描**
   - 使用索引覆盖查询
   - 避免在索引字段上使用复杂表达式
   - 避免在索引字段上进行计算

### 索引优化策略

#### 索引类型
```javascript
// 单字段索引
db.users.createIndex({username: 1});

// 复合索引
db.users.createIndex({status: 1, create_time: -1});

// 唯一索引
db.users.createIndex({email: 1}, {unique: true});

// 稀疏索引
db.users.createIndex({optional_field: 1}, {sparse: true});

// TTL索引（自动过期）
db.sessions.createIndex({expire_at: 1}, {expireAfterSeconds: 0});

// 文本索引
db.articles.createIndex({title: "text", content: "text"});

// 地理空间索引
db.places.createIndex({location: "2dsphere"});
```

#### 索引使用原则
- **最左前缀原则**: 复合索引按照从左到右的顺序使用
- **索引覆盖**: 查询只使用索引中的字段，不需要回表
- **选择性高的字段优先**: 选择性高的字段更适合放在索引前面
- **避免冗余索引**: 避免创建功能重复的索引

#### 索引失效场景
```javascript
// 以下情况可能导致索引失效

// 1. 在索引字段上使用复杂表达式
db.users.find({$expr: {$gt: [{$divide: ["$age", 2]}, 18]}});

// 2. 在索引字段上进行计算
db.orders.find({amount: {$gt: {$multiply: [100, 1.1]}}});

// 3. 使用正则表达式不以锚点开头
db.users.find({name: /john/});

// 4. 类型不匹配
db.users.find({_id: "123456789012345678901234"});  // _id是ObjectId类型

// 5. 使用$or连接条件
db.users.find({$or: [{status: "active"}, {level: "vip"}]});

// 6. 使用$ne、$nin、$not操作符
db.users.find({status: {$ne: "deleted"}});
```

### 查询重写技巧

#### 子查询优化
```javascript
// 低效的子查询（使用$expr）
db.orders.find({
  $expr: {
    $gt: [
      "$amount",
      {
        $avg: {
          $map: {
            input: db.orders.aggregate([
              {$group: {_id: null, avg: {$avg: "$amount"}}}
            ]).toArray(),
            as: "item",
            in: "$$item.avg"
          }
        }
      }
    ]
  }
});

// 优化后的查询（预先计算平均值）
let avgAmount = db.orders.aggregate([
  {$group: {_id: null, avg: {$avg: "$amount"}}}
]).toArray()[0].avg;

db.orders.find({amount: {$gt: avgAmount}});
```

#### 分页查询优化
```javascript
// 低效的分页查询（偏移量大时性能差）
db.orders.find().sort({create_time: -1}).skip(100000).limit(20);

// 优化后的分页查询（使用游标）
let lastId = null;
if (lastId) {
  db.orders.find({_id: {$lt: lastId}}).sort({_id: -1}).limit(20);
} else {
  db.orders.find().sort({_id: -1}).limit(20);
}
```

#### 批量插入优化
```javascript
// 单条插入（效率低）
db.users.insertOne({name: "John", age: 30});
db.users.insertOne({name: "Jane", age: 25});

// 批量插入（效率高）
db.users.insertMany([
  {name: "John", age: 30},
  {name: "Jane", age: 25}
]);
```

## explain 命令详解

### explain 基本用法

```javascript
// 基本语法
db.users.find({username: "john"}).explain();

// 详细执行计划
db.users.find({username: "john"}).explain("executionStats");

// 最详细的执行计划
db.users.find({username: "john"}).explain("allPlansExecution");

// 聚合管道的explain
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$group: {_id: "$user_id", total: {$sum: "$amount"}}}
]).explain();
```

### explain 输出解读

#### 基本输出字段
- **queryPlanner**: 查询计划器信息
  - **plannerVersion**: 计划器版本
  - **namespace**: 查询的集合
  - **indexFilterSet**: 是否使用了索引过滤器
  - **parsedQuery**: 解析后的查询条件
  - **winningPlan**: 被选中的执行计划
  - **rejectedPlans**: 被拒绝的执行计划列表
- **executionStats**: 执行统计信息（使用"executionStats"或"allPlansExecution"时显示）
  - **executionSuccess**: 执行是否成功
  - **nReturned**: 返回的文档数
  - **executionTimeMillis**: 执行时间（毫秒）
  - **totalDocsExamined**: 检查的文档总数
  - **totalKeysExamined**: 检查的索引键总数
  - **stage**: 执行阶段
- **serverInfo**: 服务器信息
  - **host**: 主机名
  - **port**: 端口
  - **version**: MongoDB版本

#### 执行阶段(stage)详解
- **COLLSCAN**: 全集合扫描，性能最差
- **IXSCAN**: 索引扫描
- **FETCH**: 根据索引键获取文档
- **SHARD_MERGE**: 合并分片结果
- **SORT**: 内存排序
- **LIMIT**: 限制结果数量
- **SKIP**: 跳过指定数量的文档
- **IDHACK**: 使用_id索引查询
- **PROJECTION**: 字段投影
- **EOF**: 执行结束

### explain 实例分析

#### 简单查询分析
```javascript
// 查询语句
db.users.find({_id: ObjectId("123456789012345678901234")}).explain("executionStats");

// 可能的输出
{
  "queryPlanner": {
    "plannerVersion": 1,
    "namespace": "test.users",
    "indexFilterSet": false,
    "parsedQuery": {
      "_id": {
        "$eq": ObjectId("123456789012345678901234")
      }
    },
    "winningPlan": {
      "stage": "IDHACK",  // 使用_id索引
      "inputStage": {
        "stage": "FETCH"
      }
    },
    "rejectedPlans": []
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 1,
    "executionTimeMillis": 0,
    "totalDocsExamined": 1,
    "totalKeysExamined": 1
  }
}

// 分析：
// stage=IDHACK: 使用了_id索引，性能极佳
// totalDocsExamined=1: 只检查了一个文档
// totalKeysExamined=1: 只检查了一个索引键
```

#### 复杂查询分析
```javascript
// 查询语句
db.orders.find({
  status: "completed",
  create_time: {$gt: new Date("2023-01-01")}
}).sort({amount: -1}).limit(10).explain("executionStats");

// 可能的输出
{
  "queryPlanner": {
    "plannerVersion": 1,
    "namespace": "test.orders",
    "indexFilterSet": false,
    "parsedQuery": {
      "$and": [
        {
          "status": {
            "$eq": "completed"
          }
        },
        {
          "create_time": {
            "$gt": ISODate("2023-01-01T00:00:00Z")
          }
        }
      ]
    },
    "winningPlan": {
      "stage": "LIMIT",
      "limitAmount": 10,
      "inputStage": {
        "stage": "SORT",
        "sortPattern": {
          "amount": -1
        },
        "inputStage": {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "status": 1,
              "create_time": 1
            },
            "indexName": "status_1_create_time_1",
            "isMultiKey": false,
            "multiKeyPaths": {
              "status": [],
              "create_time": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "status": ["[\"completed\", \"completed\"]"],
              "create_time": ["(new Date(1672531200000), new Date(9223372036854775807)]"]
            }
          }
        }
      }
    },
    "rejectedPlans": []
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 10,
    "executionTimeMillis": 15,
    "totalDocsExamined": 100,
    "totalKeysExamined": 100
  }
}

// 分析：
// 使用了复合索引(status, create_time)
// 需要额外的SORT操作，因为排序字段(amount)不在索引中
// totalDocsExamined=100: 检查了100个文档
// totalKeysExamined=100: 检查了100个索引键
```

### 优化案例分析

#### 案例1: 索引优化
```javascript
// 原始查询
db.orders.find({status: "completed", amount: {$gt: 1000}}).explain("executionStats");

// 输出显示stage=FETCH，inputStage=IXSCAN，但可能需要检查很多文档
// 说明amount字段没有索引，需要回表过滤

// 优化方案：创建复合索引
db.orders.createIndex({status: 1, amount: 1});

// 再次分析
db.orders.find({status: "completed", amount: {$gt: 1000}}).explain("executionStats");

// 输出可能显示totalDocsExamined和totalKeysExamined数量减少
// 性能得到提升
```

#### 案例2: 聚合管道优化
```javascript
// 原始聚合
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$lookup: {
    from: "users",
    localField: "user_id",
    foreignField: "_id",
    as: "user"
  }},
  {$unwind: "$user"},
  {$match: {"user.level": "VIP"}},
  {$group: {_id: "$user_id", total: {$sum: "$amount"}}}
]).explain();

// 输出显示$lookup后文档数量大，$match("user.level": "VIP")效率低

// 优化方案：在$lookup前过滤
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$lookup: {
    from: "users",
    let: {user_id: "$user_id"},
    pipeline: [
      {$match: {$expr: {$and: [
        {$eq: ["$_id", "$$user_id"]},
        {$eq: ["$level", "VIP"]}
      ]}}},
      {$limit: 1}
    ],
    as: "user"
  }},
  {$unwind: "$user"},
  {$group: {_id: "$user_id", total: {$sum: "$amount"}}}
]).explain();

// 输出可能显示$lookup的pipeline中使用了索引
// 性能显著提升
```

#### 案例3: 分页优化
```javascript
// 原始查询
db.orders.find().sort({create_time: -1}).skip(100000).limit(20).explain("executionStats");

// 输出显示stage=SKIP，需要跳过大量文档
// 性能很差，因为需要扫描并跳过大量文档

// 优化方案：使用游标分页
db.orders.find({_id: {$lt: ObjectId("...")}}).sort({_id: -1}).limit(20).explain("executionStats");

// 输出显示stage=LIMIT，使用了_id索引范围查询
// 性能大幅提升
```

### 高级优化技术

#### 覆盖查询
```javascript
// 创建覆盖索引
db.users.createIndex({status: 1, name: 1, email: 1});

// 覆盖查询（只查询索引中的字段）
db.users.find({status: "active"}, {name: 1, email: 1, _id: 0}).explain("executionStats");

// 输出可能显示stage=PROJECTION，inputStage=IXSCAN，没有FETCH阶段
// 表示使用了覆盖索引，不需要回表
```

#### 索引交集
```javascript
// 创建多个单字段索引
db.orders.createIndex({status: 1});
db.orders.createIndex({create_time: 1});

// 查询可能使用索引交集
db.orders.find({status: "completed", create_time: {$gt: new Date("2023-01-01")}}).explain("executionStats");

// 输出可能显示使用了索引交集优化
```

#### 索引下推
```javascript
// MongoDB 3.6+特性，将查询条件下推到存储引擎层
// 减少回表次数，提高查询性能

// 示例
db.orders.createIndex({status: 1, amount: 1});

// 查询
db.orders.find({
  status: "completed",
  amount: {$gt: 1000},
  extra_field: "value"  // 非索引字段
}).explain("executionStats");

// 输出可能显示使用了索引下推优化
```

### 性能监控工具

#### 数据库分析器
```javascript
// 启用慢查询分析器
db.setProfilingLevel(1, {slowms: 100});  // 记录超过100ms的查询

// 查看慢查询
db.system.profile.find().sort({ts: -1}).limit(5);

// 停止分析器
db.setProfilingLevel(0);
```

#### 索引使用统计
```javascript
// 查看索引使用统计
db.users.aggregate([{$indexStats: {}}]);

// 查找未使用的索引
db.users.aggregate([
  {$indexStats: {}},
  {$match: {"accesses.ops": 0}}
]);
```

#### 服务器状态
```javascript
// 查看服务器状态
db.serverStatus();

// 查看数据库状态
db.stats();

// 查看集合状态
db.users.stats();
```

### 优化最佳实践

1. **设计阶段优化**
   - 合理设计文档结构，遵循MongoDB设计原则
   - 选择合适的数据类型
   - 预先规划索引策略

2. **查询编写优化**
   - 避免无限制的find()，只查询需要的字段
   - 合理使用索引，避免索引失效
   - 注意类型匹配对索引的影响

3. **定期维护**
   - 定期分析集合统计信息
   - 清理无用索引
   - 监控索引碎片情况

4. **监控与调优**
   - 定期检查慢查询日志
   - 使用explain()分析关键查询
   - 监控数据库性能指标

5. **分片环境优化**
   - 合理选择分片键
   - 确保查询能路由到单个分片
   - 避免跨分片的全集合扫描

### 分片环境下的查询优化

#### 分片键选择
```javascript
// 创建分片集合
sh.shardCollection("test.orders", {user_id: 1, create_time: 1});

// 好的分片键特征：
// 1. 高基数（有很多不同值）
// 2. 非单调递增（避免热点）
// 3. 常用查询字段
```

#### 分片查询优化
```javascript
// 优化前：跨分片查询
db.orders.find({create_time: {$gt: new Date("2023-01-01")}}).explain();

// 优化后：包含分片键的查询
db.orders.find({
  user_id: ObjectId("..."),
  create_time: {$gt: new Date("2023-01-01")}
}).explain();
```

#### 聚合管道优化
```javascript
// 优化前：跨分片聚合
db.orders.aggregate([
  {$group: {_id: "$status", total: {$sum: "$amount"}}}
]);

// 优化后：使用$facet并行处理
db.orders.aggregate([
  {$facet: {
    "by_status": [
      {$group: {_id: "$status", total: {$sum: "$amount"}}}
    ],
    "by_user": [
      {$group: {_id: "$user_id", total: {$sum: "$amount"}}}
    ]
  }}
]);
```