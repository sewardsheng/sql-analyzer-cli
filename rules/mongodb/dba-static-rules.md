# MongoDB DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的MongoDB静态规则，这些规则是基于最佳实践和生产环境经验总结的强制性要求。

---

## 查询性能规则

### 禁止全集合扫描规则

#### 规则: MONGO-001 - 禁止生产环境全集合扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全集合扫描查询（除非集合文档数小于10000个）

**检测条件**:
- 查询计划中COLLSCAN阶段
- 预估扫描文档数 > 10000
- 没有合适的查询条件

**违规示例**:
```javascript
// 违规: 全集合扫描
db.users.find();

// 违规: 查询条件未使用索引
db.orders.find({$where: "this.amount > 1000"});

// 违规: 正则表达式不以锚点开头
db.products.find({name: /phone/});
```

**正确示例**:
```javascript
// 正确: 使用索引字段作为条件
db.users.find({_id: ObjectId("123456789012345678901234")});

// 正确: 避免使用$where
db.orders.find({amount: {$gt: 1000}});

// 正确: 正则表达式以锚点开头
db.products.find({name: /^phone/});
```

**例外情况**:
- 小集合查询（文档数 < 10000）
- 统计分析查询（需要显式标注）
- 临时集合或中间集合查询

---

### 规则: MONGO-002 - 禁止不带索引的关联查询
**严重级别**: 高  
**规则描述**: $lookup操作的关联字段必须建立索引

**检测条件**:
- $lookup操作中localField和foreignField没有索引
- 执行计划显示COLLSCAN阶段

**违规示例**:
```javascript
// 违规: customer_id没有索引
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customer_id",  // 未索引
      foreignField: "_id",        // 已索引
      as: "customer"
    }
  }
]);

// 违规: 多个$lookup条件都没有索引
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "product_id",   // 未索引
      foreignField: "_id",
      as: "product"
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "category_id", // 未索引
      foreignField: "_id",
      as: "category"
    }
  }
]);
```

**正确示例**:
```javascript
// 正确: 先创建索引再关联
db.orders.createIndex({customer_id: 1});
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customer_id",  // 已索引
      foreignField: "_id",
      as: "customer"
    }
  }
]);

// 正确: 所有关联字段都有索引
db.orders.createIndex({product_id: 1});
db.orders.createIndex({category_id: 1});
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "product_id",   // 已索引
      foreignField: "_id",
      as: "product"
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "category_id", // 已索引
      foreignField: "_id",
      as: "category"
    }
  }
]);
```

---

### 规则: MONGO-003 - 禁止大偏移量分页查询
**严重级别**: 中  
**规则描述**: 禁止使用大偏移量的skip分页（skip > 10000）

**检测条件**:
- skip()值 > 10000
- 可能导致性能问题

**违规示例**:
```javascript
// 违规: 大偏移量分页
db.orders.find().sort({create_time: -1}).skip(100000).limit(20);

// 违规: 偏移量过大
db.users.find().skip(50000).limit(100);
```

**正确示例**:
```javascript
// 正确: 使用游标分页
let lastId = null;
if (lastId) {
  db.orders.find({_id: {$lt: lastId}}).sort({_id: -1}).limit(20);
} else {
  db.orders.find().sort({_id: -1}).limit(20);
}

// 正确: 使用范围查询分页
db.orders.find({
  create_time: {$lt: new Date("2023-12-01")}
}).sort({create_time: -1}).limit(20);
```

---

## 索引使用规则

### 规则: MONGO-004 - 禁止在索引字段上使用复杂表达式
**严重级别**: 高  
**规则描述**: 禁止在查询条件的索引字段上使用复杂表达式

**检测条件**:
- 索引字段被复杂表达式包裹
- 导致索引失效

**违规示例**:
```javascript
// 违规: 在索引字段使用表达式
db.orders.find({$expr: {$gt: [{$divide: ["$amount", 100]}, 10]}});

// 违规: 在索引字段使用函数
db.users.find({$where: "this.username.toUpperCase() === 'ADMIN'"});

// 违规: 在索引字段进行计算
db.products.find({price: {$gt: {$multiply: [100, 1.1]}}});
```

**正确示例**:
```javascript
// 正确: 改写查询避免表达式
db.orders.find({amount: {$gt: 1100}});

// 正确: 创建表达式索引或在应用层处理
db.users.createIndex({username: 1});
db.users.find({username: "ADMIN"});

// 正确: 改写计算表达式
db.products.find({price: {$gt: 110}});
```

---

### 规则: MONGO-005 - 禁止冗余索引
**严重级别**: 中  
**规则描述**: 禁止创建功能重复或冗余的索引

**检测条件**:
- 索引字段完全相同
- 单字段索引与复合索引重复
- 索引前缀重复

**违规示例**:
```javascript
// 违规: 完全重复的索引
db.users.createIndex({username: 1});
db.users.createIndex({username: 1});  // 重复

// 违规: 单字段索引被复合索引包含
db.orders.createIndex({user_id: 1});
db.orders.createIndex({user_id: 1, create_time: -1});  // user_id索引冗余

// 违规: 前缀重复
db.products.createIndex({a: 1, b: 1, c: 1});
db.products.createIndex({a: 1, b: 1});  // 冗余
```

**正确示例**:
```javascript
// 正确: 只创建必要的索引
db.orders.createIndex({user_id: 1, create_time: -1});

// 正确: 根据查询模式创建不同的复合索引
db.orders.createIndex({user_id: 1, status: 1});
db.orders.createIndex({status: 1, create_time: -1});
```

---

### 规则: MONGO-006 - 限制单集合索引数量
**严重级别**: 中  
**规则描述**: 单集合索引总数不超过64个（MongoDB默认限制）

**检测条件**:
- 统计集合的索引数量
- 超过阈值则告警

**违规示例**:
```javascript
// 违规: 索引过多
for (let i = 0; i < 70; i++) {
  db.users.createIndex({[`field${i}`]: 1});
}
```

**正确示例**:
```javascript
// 正确: 合理规划复合索引
db.users.createIndex({field1: 1, field2: 1});
db.users.createIndex({field3: 1, field4: 1});
db.users.createIndex({field5: 1});
// 总共3个索引，满足要求
```

---

## 查询语句规范规则

### 规则: MONGO-007 - 禁止使用无限制的find()
**严重级别**: 中  
**规则描述**: 禁止使用无查询条件和限制的find()，必须明确指定查询条件

**检测条件**:
- 查询语句使用空find()或find({})

**违规示例**:
```javascript
// 违规: 使用无限制find()
db.users.find();

// 违规: 使用空条件find()
db.users.find({});
```

**正确示例**:
```javascript
// 正确: 明确指定条件
db.users.find({status: "active"});

// 正确: 只查询需要的字段
db.users.find({status: "active"}, {name: 1, email: 1, _id: 0});
```

**例外情况**:
- 集合导出操作
- 统计分析查询（需要显式标注）

---

### 规则: MONGO-008 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: 查询条件必须与字段类型匹配，避免隐式类型转换导致索引失效

**检测条件**:
- 数值字段使用字符串比较
- 字符串字段使用数值比较
- 导致索引失效

**违规示例**:
```javascript
// 违规: 数值字段使用字符串
db.users.find({_id: "123456789012345678901234"});  // _id是ObjectId类型

// 违规: 字符串字段使用数值
db.products.find({code: 123});  // code是字符串类型

// 违规: 日期字段使用字符串比较
db.orders.find({create_time: "2023-01-01"});  // 应该使用Date对象
```

**正确示例**:
```javascript
// 正确: 类型匹配
db.users.find({_id: ObjectId("123456789012345678901234")});

// 正确: 字符串使用引号
db.products.find({code: "123"});

// 正确: 使用正确的日期格式
db.orders.find({create_time: new Date("2023-01-01")});
```

---

### 规则: MONGO-009 - 禁止使用负向查询
**严重级别**: 中  
**规则描述**: 禁止使用$ne、$nin、$not等负向查询

**检测条件**:
- 查询包含负向操作符
- 可能导致索引失效

**违规示例**:
```javascript
// 违规: 使用$ne
db.orders.find({status: {$ne: "cancelled"}});

// 违规: 使用$nin
db.users.find({level: {$nin: ["bronze", "silver"]}});

// 违规: 使用$not
db.products.find({price: {$not: {$gt: 100}}});
```

**正确示例**:
```javascript
// 正确: 使用$in正向查询
db.orders.find({status: {$in: ["pending", "processing", "completed"]}});

// 正确: 使用$gt正向查询
db.products.find({price: {$lte: 100}});
```

---

### 规则: MONGO-010 - 禁止使用$or条件
**严重级别**: 中  
**规则描述**: 建议使用$in替代$or，避免索引失效

**检测条件**:
- 查询包含$or条件
- 可能导致索引失效

**违规示例**:
```javascript
// 违规: 使用$or连接不同字段
db.users.find({$or: [{_id: 1}, {username: "admin"}]});

// 违规: $or连接范围查询
db.orders.find({$or: [{status: "pending"}, {create_time: {$gt: new Date("2023-01-01")}}]});
```

**正确示例**:
```javascript
// 正确: 使用$in替代单字段$or
db.orders.find({status: {$in: ["pending", "processing"]}});

// 正确: 分开查询后合并结果
let results1 = db.users.find({_id: 1}).toArray();
let results2 = db.users.find({username: "admin"}).toArray();
let results = [...results1, ...results2];
```

---

## 写入操作规则

### 规则: MONGO-011 - 禁止大批量操作不分批
**严重级别**: 高  
**规则描述**: 大批量insert、update、delete操作必须分批执行

**检测条件**:
- 单次操作影响文档数 > 5000
- 可能导致锁等待和性能问题

**违规示例**:
```javascript
// 违规: 大批量删除
db.orders.deleteMany({create_time: {$lt: new Date("2020-01-01")}});  // 可能影响数十万文档

// 违规: 大批量更新
db.users.updateMany(
  {last_login: {$lt: new Date("2022-01-01")}},
  {$set: {status: "inactive"}}
);

// 违规: 大批量插入未分批
let largeArray = []; // 假设有10万条数据
db.archive.insertMany(largeArray);
```

**正确示例**:
```javascript
// 正确: 分批删除
let batchSize = 1000;
let deletedCount = 0;
do {
  let result = db.orders.deleteMany({
    create_time: {$lt: new Date("2020-01-01")}
  }).limit(batchSize);
  deletedCount = result.deletedCount;
} while (deletedCount === batchSize);

// 正确: 分批更新
let batchSize = 1000;
let updatedCount = 0;
do {
  let result = db.users.updateMany(
    {last_login: {$lt: new Date("2022-01-01")}},
    {$set: {status: "inactive"}}
  ).limit(batchSize);
  updatedCount = result.modifiedCount;
} while (updatedCount === batchSize);

// 正确: 分批插入
let batchSize = 1000;
for (let i = 0; i < largeArray.length; i += batchSize) {
  let batch = largeArray.slice(i, i + batchSize);
  db.archive.insertMany(batch);
}
```

---

### 规则: MONGO-012 - 禁止在事务中执行DDL
**严重级别**: 高  
**规则描述**: 禁止在事务中执行createIndex、createCollection等DDL操作

**检测条件**:
- 事务中包含DDL语句
- 可能导致事务阻塞

**违规示例**:
```javascript
// 违规: 事务中执行DDL
session.startTransaction();
try {
  db.users.updateOne({_id: 1}, {$set: {status: "active"}}, {session});
  db.users.createIndex({new_field: 1}, {session});  // DDL
  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
}

// 违规: 事务中创建集合
session.startTransaction();
try {
  db.logs.insertOne({...}, {session});
  db.createCollection("new_collection", {session});  // DDL
  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
}
```

**正确示例**:
```javascript
// 正确: DDL在事务外执行
db.users.createIndex({new_field: 1});

// 正确: 先完成事务，再执行DDL
session.startTransaction();
try {
  db.users.updateOne({_id: 1}, {$set: {status: "active"}}, {session});
  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
}
// 事务完成后再执行DDL
db.users.createIndex({new_field: 1});
```

---

## 聚合管道规则

### 规则: MONGO-013 - 禁止使用高危操作符
**严重级别**: 高  
**规则描述**: 禁止使用可能导致性能问题或安全风险的聚合操作符

**禁用操作符列表**:
- `$where` - JavaScript表达式，性能差且安全风险
- `$function` - JavaScript函数，安全风险
- `$accumulator` - 自定义累加器，性能风险
- `$out` - 覆盖集合，数据丢失风险
- `$merge` - 可能导致数据不一致

**违规示例**:
```javascript
// 违规: 使用$where
db.users.find({$where: "this.username === 'admin' && this.password === 'secret'"});

// 违规: 使用$function
db.orders.aggregate([
  {
    $addFields: {
      total: {
        $function: {
          body: function(items) { return items.reduce((sum, item) => sum + item.price, 0); },
          args: ["$items"],
          lang: "js"
        }
      }
    }
  }
]);

// 违规: 使用$out覆盖集合
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$out: "orders_backup"}  // 覆盖集合
]);
```

**正确示例**:
```javascript
// 正确: 使用标准查询操作符
db.users.find({username: "admin", password: "secret"});

// 正确: 使用内置聚合操作符
db.orders.aggregate([
  {
    $addFields: {
      total: {$sum: "$items.price"}
    }
  }
]);

// 正确: 使用$merge并指定选项
db.orders.aggregate([
  {$match: {status: "completed"}},
  {
    $merge: {
      into: "orders_backup",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
]);
```

---

### 规则: MONGO-014 - 禁止使用$lookup无限制关联
**严重级别**: 中  
**规则描述**: $lookup操作必须限制关联文档数量，避免笛卡尔积

**检测条件**:
- $lookup操作没有关联条件限制
- 可能导致大量文档关联

**违规示例**:
```javascript
// 违规: 无限制关联
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "product_id",
      foreignField: "_id",
      as: "product"
      // 没有pipeline限制关联文档
    }
  }
]);

// 违规: 关联大集合无限制
db.users.aggregate([
  {
    $lookup: {
      from: "orders",  // 大集合
      localField: "_id",
      foreignField: "user_id",
      as: "orders"
      // 没有pipeline限制关联文档
    }
  }
]);
```

**正确示例**:
```javascript
// 正确: 使用pipeline限制关联文档
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "product_id",
      foreignField: "_id",
      as: "product",
      pipeline: [
        {$match: {status: "active"}},  // 限制条件
        {$limit: 10}  // 限制数量
      ]
    }
  }
]);

// 正确: 关联大集合时添加限制
db.users.aggregate([
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "user_id",
      as: "recent_orders",
      pipeline: [
        {$match: {create_time: {$gte: new Date("2023-01-01")}}},  // 时间限制
        {$sort: {create_time: -1}},
        {$limit: 5}  // 只取最近5条
      ]
    }
  }
]);
```

---

## 文档设计规则

### 规则: MONGO-015 - 禁止使用无限增长的数组
**严重级别**: 高  
**规则描述**: 避免使用无限增长的数组字段，可能导致文档超过16MB限制

**检测条件**:
- 数组字段可能无限增长
- 可能导致文档过大

**违规示例**:
```javascript
// 违规: 评论数组可能无限增长
db.posts.insertOne({
  _id: 1,
  title: "My Post",
  content: "...",
  comments: []  // 可能无限增长
});

// 违规: 日志数组可能无限增长
db.users.insertOne({
  _id: 1,
  name: "John",
  login_history: []  // 可能无限增长
});
```

**正确示例**:
```javascript
// 正确: 使用单独集合存储评论
db.posts.insertOne({
  _id: 1,
  title: "My Post",
  content: "..."
});

db.comments.insertMany([
  {post_id: 1, user_id: 2, content: "Great post!", create_time: new Date()},
  {post_id: 1, user_id: 3, content: "I agree!", create_time: new Date()}
]);

// 正确: 使用单独集合存储登录历史
db.users.insertOne({
  _id: 1,
  name: "John"
});

db.login_history.insertMany([
  {user_id: 1, login_time: new Date(), ip: "192.168.1.1"},
  {user_id: 1, login_time: new Date(), ip: "192.168.1.2"}
]);
```

---

### 规则: MONGO-016 - 禁止使用深度嵌套文档
**严重级别**: 中  
**规则描述**: 避免使用深度嵌套的文档结构，建议嵌套深度不超过3层

**检测条件**:
- 文档嵌套深度 > 3
- 可能影响查询性能

**违规示例**:
```javascript
// 违规: 深度嵌套
db.users.insertOne({
  _id: 1,
  name: "John",
  profile: {
    personal: {
      basic: {
        name: "John",
        age: 30,
        details: {
          hair_color: "brown",
          eye_color: "blue",
          characteristics: {
            height: 180,
            weight: 75,
            // 更多嵌套...
          }
        }
      }
    }
  }
});
```

**正确示例**:
```javascript
// 正确: 扁平化文档结构
db.users.insertOne({
  _id: 1,
  name: "John",
  age: 30,
  hair_color: "brown",
  eye_color: "blue",
  height: 180,
  weight: 75
});

// 或者使用引用
db.users.insertOne({
  _id: 1,
  name: "John",
  profile_id: ObjectId("123456789012345678901234")
});

db.profiles.insertOne({
  _id: ObjectId("123456789012345678901234"),
  personal_details: {
    hair_color: "brown",
    eye_color: "blue",
    height: 180,
    weight: 75
  }
});
```

---

## 集合设计规则

### 规则: MONGO-017 - 强制使用合理的集合命名
**严重级别**: 高  
**规则描述**: 集合名称必须使用小写字母和下划线，避免使用特殊字符

**检测条件**:
- 集合名称不符合命名规范
- 可能导致维护困难

**违规示例**:
```javascript
// 违规: 使用大写字母
db.createCollection("Users");

// 违规: 使用特殊字符
db.createCollection("user-profiles");

// 违规: 使用驼峰命名
db.createCollection("userProfiles");
```

**正确示例**:
```javascript
// 正确: 使用小写字母和下划线
db.createCollection("users");
db.createCollection("user_profiles");
db.createCollection("order_items");
```

---

## 规则总结

### 规则严重级别说明
- **高**: 必须严格遵守，违反将导致严重性能问题或安全风险
- **中**: 强烈建议遵守，违反可能导致性能下降或维护困难
- **低**: 建议遵守，有助于提升代码质量和可维护性

### 规则检查清单

#### 查询性能（5项）
- [ ] MONGO-001: 避免全集合扫描
- [ ] MONGO-002: 关联字段必须有索引
- [ ] MONGO-003: 避免大偏移量分页
- [ ] MONGO-004: 索引字段不使用复杂表达式
- [ ] MONGO-014: 限制$lookup关联文档数量

#### 索引管理（3项）
- [ ] MONGO-005: 避免冗余索引
- [ ] MONGO-006: 控制索引数量
- [ ] MONGO-002: 关联字段建立索引

#### 查询规范（5项）
- [ ] MONGO-007: 不使用无限制find()
- [ ] MONGO-008: 避免隐式类型转换
- [ ] MONGO-009: 避免负向查询
- [ ] MONGO-010: 避免$or条件
- [ ] MONGO-017: 使用合理的集合命名

#### 写入操作（2项）
- [ ] MONGO-011: 大批量操作分批执行
- [ ] MONGO-012: 事务中不执行DDL

#### 聚合管道（2项）
- [ ] MONGO-013: 避免高危操作符
- [ ] MONGO-014: 限制$lookup关联文档数量

#### 文档设计（2项）
- [ ] MONGO-015: 避免无限增长的数组
- [ ] MONGO-016: 避免深度嵌套文档

#### 集合设计（1项）
- [ ] MONGO-017: 使用合理的集合命名

### 规则应用建议

1. **开发阶段**: 在代码审查时强制检查这些规则
2. **测试阶段**: 使用explain()分析所有查询的执行计划
3. **上线前**: 进行全面的查询审计，确保符合所有规则
4. **生产环境**: 持续监控慢查询日志，识别违规查询

### 自动化检查

建议使用以下工具自动检查规则合规性:
- MongoDB Compass 查询分析器
- MongoDB Atlas 性能监控
- 自定义静态分析脚本
- 第三方MongoDB审计工具

---

## 附录：规则配置示例

### MongoDB配置建议
```yaml
# mongod.conf
# 慢查询日志
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

# 连接限制
net:
  maxIncomingConnections: 1000

# 写入关注
replication:
  writeConcernMajorityJournalDefault: true

# 安全配置
security:
  authorization: enabled
```

### 应用层配置建议
```javascript
// 连接配置
const mongoOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  
  // 写入关注
  writeConcern: {
    w: "majority",
    j: true,
    wtimeout: 5000
  },
  
  // 读关注
  readConcern: {
    level: "majority"
  },
  
  // 读偏好
  readPreference: "primary"
};
```

### 索引监控脚本示例
```javascript
// 监控索引使用情况
db.runCommand({
  aggregate: "users",
  pipeline: [
    {
      $indexStats: {}
    }
  ],
  cursor: {}
});

// 查找未使用的索引
db.runCommand({
  aggregate: "users",
  pipeline: [
    {
      $indexStats: {}
    },
    {
      $match: {
        accesses: {
          ops: 0
        }
      }
    }
  ],
  cursor: {}
});
```