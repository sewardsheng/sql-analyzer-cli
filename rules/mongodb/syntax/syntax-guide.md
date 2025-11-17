# MongoDB 语法指南

## 基本概念

### 文档与集合

MongoDB 是基于文档的 NoSQL 数据库，数据以 BSON（二进制 JSON）格式存储。基本概念包括：

- **文档（Document）**: MongoDB 中的基本数据单元，类似于关系型数据库中的行
- **集合（Collection）**: 文档的集合，类似于关系型数据库中的表
- **数据库（Database）**: 集合的容器，类似于关系型数据库中的数据库

### 数据类型

MongoDB 支持以下数据类型：

```javascript
// 字符串
{name: "张三"}

// 整数
{age: 30}

// 浮点数
{price: 19.99}

// 布尔值
{active: true}

// 数组
{tags: ["mongodb", "database", "nosql"]}

// 对象（嵌套文档）
{address: {city: "北京", street: "中关村"}}

// ObjectId（唯一标识符）
{_id: ObjectId("60a5e2a9f8a9e1a5a8e8b8c8")}

// 日期
{create_time: new Date("2023-01-01")}

// Null
{description: null}

// 正则表达式
{pattern: /mongodb/i}

// 代码
{func: function() { return "Hello MongoDB"; }}

// 二进制数据
{data: BinData(0, "AQID")}

// 时间戳
{timestamp: Timestamp(1612137600, 1)}
```

## 基本操作

### 数据库操作

```javascript
// 显示所有数据库
show dbs;

// 切换到指定数据库（不存在则创建）
use mydb;

// 显示当前数据库
db;

// 删除当前数据库
db.dropDatabase();
```

### 集合操作

```javascript
// 创建集合（显式创建）
db.createCollection("users");

// 显示所有集合
show collections;

// 删除集合
db.users.drop();

// 重命名集合
db.users.renameCollection("new_users");
```

## CRUD 操作

### 插入文档

```javascript
// 插入单个文档
db.users.insertOne({
  name: "张三",
  age: 30,
  email: "zhangsan@example.com",
  address: {
    city: "北京",
    street: "中关村"
  },
  tags: ["developer", "mongodb"],
  create_time: new Date()
});

// 插入多个文档
db.users.insertMany([
  {
    name: "李四",
    age: 25,
    email: "lisi@example.com",
    create_time: new Date()
  },
  {
    name: "王五",
    age: 35,
    email: "wangwu@example.com",
    create_time: new Date()
  }
]);

// 插入文档（如果不存在则创建）
db.users.updateOne(
  {name: "赵六"},
  {$set: {age: 28, email: "zhaoliu@example.com"}},
  {upsert: true}
);
```

### 查询文档

```javascript
// 查询所有文档
db.users.find();

// 查询指定条件的文档
db.users.find({age: {$gt: 25}});

// 查询并格式化输出
db.users.find().pretty();

// 查询指定字段
db.users.find({age: {$gt: 25}}, {name: 1, age: 1, _id: 0});

// 查询单个文档
db.users.findOne({name: "张三"});

// 查询并限制数量
db.users.find().limit(5);

// 查询并跳过指定数量
db.users.find().skip(10);

// 查询并排序
db.users.find().sort({age: 1});  // 升序
db.users.find().sort({age: -1}); // 降序

// 查询并计数
db.users.countDocuments({age: {$gt: 25}});

// 查询并去重
db.users.distinct("age");
```

### 查询条件

```javascript
// 比较操作符
db.users.find({age: {$gt: 25}});      // 大于
db.users.find({age: {$gte: 25}});     // 大于等于
db.users.find({age: {$lt: 25}});      // 小于
db.users.find({age: {$lte: 25}});     // 小于等于
db.users.find({age: {$ne: 25}});      // 不等于
db.users.find({age: {$in: [25, 30, 35]}}); // 在数组中
db.users.find({age: {$nin: [25, 30, 35]}}); // 不在数组中

// 逻辑操作符
db.users.find({$and: [{age: {$gt: 25}}, {name: "张三"}]}); // AND
db.users.find({$or: [{age: {$gt: 30}}, {name: "张三"}]});   // OR
db.users.find({$not: {age: {$gt: 30}}});                    // NOT
db.users.find({$nor: [{age: {$gt: 30}}, {name: "张三"}]});  // NOR

// 元素操作符
db.users.find({address: {$exists: true}});   // 字段存在
db.users.find({address: {$type: "object"}});  // 字段类型

// 数组操作符
db.users.find({tags: "mongodb"});             // 数组包含指定值
db.users.find({tags: {$all: ["mongodb", "database"]}}); // 数组包含所有指定值
db.users.find({tags: {$size: 2}});            // 数组长度
db.users.find({tags: {$elemMatch: {$eq: "mongodb"}}}); // 数组元素匹配

// 正则表达式
db.users.find({name: /张/});                   // 包含"张"
db.users.find({name: /^张/});                  // 以"张"开头
db.users.find({name: /三$/});                  // 以"三"结尾
db.users.find({name: /张/i});                  // 不区分大小写

// 查询嵌套文档
db.users.find({"address.city": "北京"});       // 点号表示法
db.users.find({address: {city: "北京", street: "中关村"}}); // 完整匹配

// 查询数组中的嵌套文档
db.orders.find({"items.name": "笔记本电脑"});   // 点号表示法
```

### 更新文档

```javascript
// 更新单个文档
db.users.updateOne(
  {name: "张三"},
  {$set: {age: 31}}
);

// 更新多个文档
db.users.updateMany(
  {age: {$lt: 30}},
  {$inc: {age: 1}}
);

// 替换文档
db.users.replaceOne(
  {name: "张三"},
  {name: "张三", age: 31, email: "zhangsan_new@example.com"}
);

// 更新操作符
db.users.updateOne(
  {name: "张三"},
  {
    $set: {age: 31, email: "zhangsan_new@example.com"}, // 设置字段值
    $inc: {score: 10},                                   // 增加数值
    $mul: {price: 1.1},                                  // 乘以数值
    $min: {age: 30},                                     // 设置为较小值
    $max: {age: 35},                                     // 设置为较大值
    $currentDate: {last_update: true},                   // 设置为当前日期
    $unset: {temp_field: 1},                             // 删除字段
    $push: {tags: "new_tag"},                            // 添加到数组
    $pull: {tags: "old_tag"},                            // 从数组删除
    $addToSet: {tags: "unique_tag"},                     // 添加到数组（去重）
    $pop: {tags: 1},                                     // 删除数组最后一个元素
    $pullAll: {tags: ["tag1", "tag2"]},                  // 删除数组多个元素
    $rename: {old_name: "new_name"}                      // 重命名字段
  }
);

// 更新数组中的元素
db.users.updateOne(
  {name: "张三", "tags": "old_tag"},
  {$set: {"tags.$": "new_tag"}}
);

// 更新数组中的嵌套文档
db.orders.updateOne(
  {_id: ObjectId("..."), "items.name": "笔记本电脑"},
  {$set: {"items.$.price": 4999}}
);

// 更新数组中所有匹配的元素
db.users.updateMany(
  {name: "张三"},
  {$set: {"tags.$[elem]": "updated_tag"}},
  {arrayFilters: [{"elem": "old_tag"}]}
);
```

### 删除文档

```javascript
// 删除单个文档
db.users.deleteOne({name: "张三"});

// 删除多个文档
db.users.deleteMany({age: {$lt: 25}});

// 删除集合中的所有文档
db.users.deleteMany({});

// 删除集合
db.users.drop();
```

## 聚合操作

### 聚合管道

聚合管道是 MongoDB 中处理数据的核心工具，通过一系列阶段（stage）处理文档。

```javascript
// 基本聚合语法
db.collection.aggregate([
  {stage1},
  {stage2},
  {stage3}
]);
```

### 常用聚合阶段

```javascript
// $match: 筛选文档
db.orders.aggregate([
  {$match: {status: "completed"}}
]);

// $group: 分组聚合
db.orders.aggregate([
  {$group: {
    _id: "$user_id",  // 分组字段
    total: {$sum: "$amount"},    // 求和
    count: {$sum: 1},           // 计数
    avg: {$avg: "$amount"},      // 平均值
    max: {$max: "$amount"},      // 最大值
    min: {$min: "$amount"},      // 最小值
    first: {$first: "$amount"},  // 第一个值
    last: {$last: "$amount"},    // 最后一个值
    push: {$push: "$amount"},    // 推入数组
    addToSet: {$addToSet: "$amount"} // 推入数组（去重）
  }}
]);

// $project: 投射（选择/重命名字段）
db.users.aggregate([
  {$project: {
    name: 1,                    // 包含字段
    age: 1,
    email: 0,                   // 排除字段
    full_name: {$concat: ["$name", " (", "$email", ")"]}, // 计算字段
    upper_name: {$toUpper: "$name"}, // 转换为大写
    age_group: {$cond: {
      if: {$gte: ["$age", 30]},
      then: "30+",
      else: "under30"
    }}
  }}
]);

// $sort: 排序
db.orders.aggregate([
  {$sort: {create_time: -1, amount: -1}}
]);

// $limit: 限制结果数量
db.orders.aggregate([
  {$limit: 10}
]);

// $skip: 跳过指定数量的文档
db.orders.aggregate([
  {$skip: 10}
]);

// $unwind: 展开数组
db.users.aggregate([
  {$unwind: "$tags"}
]);

// $lookup: 左连接
db.orders.aggregate([
  {$lookup: {
    from: "users",           // 关联的集合
    localField: "user_id",   // 当前集合的字段
    foreignField: "_id",     // 关联集合的字段
    as: "user"               // 输出字段名
  }}
]);

// $lookup: 自定义管道连接（MongoDB 3.6+）
db.orders.aggregate([
  {$lookup: {
    from: "users",
    let: {userId: "$user_id"},
    pipeline: [
      {$match: {$expr: {$eq: ["$_id", "$$userId"]}}},
      {$project: {name: 1, email: 1}}
    ],
    as: "user"
  }}
]);

// $facet: 多 facet 聚合（并行处理多个聚合管道）
db.orders.aggregate([
  {$facet: {
    "by_status": [
      {$group: {_id: "$status", count: {$sum: 1}}}
    ],
    "by_user": [
      {$group: {_id: "$user_id", total: {$sum: "$amount"}}},
      {$sort: {total: -1}},
      {$limit: 10}
    ],
    "stats": [
      {$group: {
        _id: null,
        total_amount: {$sum: "$amount"},
        avg_amount: {$avg: "$amount"},
        max_amount: {$max: "$amount"},
        min_amount: {$min: "$amount"}
      }}
    ]
  }}
]);

// $bucket: 分桶聚合
db.orders.aggregate([
  {$bucket: {
    groupBy: "$amount",
    boundaries: [0, 100, 500, 1000, Infinity],
    default: "other",
    output: {
      count: {$sum: 1},
      total: {$sum: "$amount"}
    }
  }}
]);

// $sample: 随机抽样
db.orders.aggregate([
  {$sample: {size: 10}}
]);

// $count: 计数
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$count: "completed_orders"}
]);

// $addFields: 添加字段
db.orders.aggregate([
  {$addFields: {
    year: {$year: "$create_time"},
    month: {$month: "$create_time"},
    day: {$dayOfMonth: "$create_time"}
  }}
]);

// $replaceRoot: 替换根文档
db.users.aggregate([
  {$replaceRoot: {newRoot: "$address"}}
]);

// $redact: 数据访问控制
db.documents.aggregate([
  {$redact: {
    $cond: {
      if: {$eq: ["$access_level", "public"]},
      then: "$$KEEP",
      else: {
        $cond: {
          if: {$eq: ["$access_level", "private"]},
          then: "$$PRUNE",
          else: "$$DESCEND"
        }
      }
    }
  }}
]);
```

### 聚合表达式

```javascript
// 算术表达式
{$add: ["$price", "$tax"]}      // 加法
{$subtract: ["$price", "$discount"]} // 减法
{$multiply: ["$price", 1.1]}    // 乘法
{$divide: ["$total", "$count"]} // 除法
{$mod: ["$number", 10]}         // 取模

// 字符串表达式
{$concat: ["$first_name", " ", "$last_name"]} // 连接
{$substr: ["$name", 0, 3]}      // 子字符串
{$toLower: "$name"}             // 转小写
{$toUpper: "$name"}             // 转大写
{$strLenCP: "$name"}            // 字符串长度
{$split: ["$tags", ","]}       // 分割字符串

// 日期表达式
{$year: "$date"}                // 年
{$month: "$date"}               // 月
{$dayOfMonth: "$date"}          // 日
{$hour: "$date"}                // 小时
{$minute: "$date"}              // 分钟
{$second: "$date"}              // 秒
{$dayOfWeek: "$date"}           // 星期几
{$dayOfYear: "$date"}           // 一年中的第几天
{$week: "$date"}                // 一年中的第几周
{$dateToString: {format: "%Y-%m-%d", date: "$date"}} // 日期转字符串
{$dateFromString: {format: "%Y-%m-%d", dateString: "$date_str"}} // 字符串转日期

// 条件表达式
{$cond: {
  if: {$gt: ["$age", 18]},
  then: "adult",
  else: "minor"
}}

{$ifNull: ["$nickname", "$name"]} // 如果第一个值为null，则返回第二个值

// 集合表达式
{$size: "$tags"}                // 数组长度
{$isArray: "$tags"}             // 是否是数组
{$map: {
  input: "$tags",
  as: "tag",
  in: {$toUpper: "$$tag"}
}} // 映射数组

{$filter: {
  input: "$tags",
  as: "tag",
  cond: {$ne: ["$$tag", ""]}
}} // 过滤数组

{$reduce: {
  input: "$numbers",
  initialValue: 0,
  in: {$add: ["$$value", "$$this"]}
}} // 归约数组

// 类型转换表达式
{$toString: "$_id"}             // 转字符串
{$toInt: "$age"}                // 转整数
{$toLong: "$age"}               // 转长整数
{$toDouble: "$price"}           // 转浮点数
{$toDecimal: "$price"}          // 转高精度小数
{$toBool: "$active"}            // 转布尔值
{$toDate: "$timestamp"}         // 转日期
{$toObjectId: "$id_str"}        // 转ObjectId
```

## 索引

### 创建索引

```javascript
// 创建单字段索引
db.users.createIndex({name: 1});

// 创建复合索引
db.users.createIndex({status: 1, age: -1});

// 创建唯一索引
db.users.createIndex({email: 1}, {unique: true});

// 创建稀疏索引
db.users.createIndex({optional_field: 1}, {sparse: true});

// 创建TTL索引（自动过期）
db.sessions.createIndex({expire_at: 1}, {expireAfterSeconds: 0});

// 创建文本索引
db.articles.createIndex({title: "text", content: "text"});

// 创建地理空间索引
db.places.createIndex({location: "2dsphere"});

// 创建哈希索引
db.users.createIndex({name: "hashed"});

// 创建部分索引
db.users.createIndex(
  {status: 1},
  {partialFilterExpression: {status: {$ne: "inactive"}}}
);
```

### 查看索引

```javascript
// 查看集合的所有索引
db.users.getIndexes();

// 查看索引使用统计
db.users.aggregate([{$indexStats: {}}]);

// 查看索引大小
db.users.totalIndexSize();
```

### 删除索引

```javascript
// 删除指定索引
db.users.dropIndex({name: 1});

// 删除所有索引（除了_id索引）
db.users.dropIndexes();
```

## 事务

### 事务操作

```javascript
// 开始事务
const session = db.getMongo().startSession();
session.startTransaction();

try {
  // 在事务中执行操作
  const coll1 = session.getDatabase("mydb").collection("accounts");
  const coll2 = session.getDatabase("mydb").collection("transactions");
  
  // 转账操作
  await coll1.updateOne(
    {_id: ObjectId("account1")},
    {$inc: {balance: -100}}
  );
  
  await coll1.updateOne(
    {_id: ObjectId("account2")},
    {$inc: {balance: 100}}
  );
  
  await coll2.insertOne({
    from: ObjectId("account1"),
    to: ObjectId("account2"),
    amount: 100,
    timestamp: new Date()
  });
  
  // 提交事务
  await session.commitTransaction();
  console.log("事务提交成功");
} catch (error) {
  // 回滚事务
  await session.abortTransaction();
  console.log("事务回滚:", error);
} finally {
  session.endSession();
}
```

### 事务配置

```javascript
// 设置事务隔离级别
session.startTransaction({
  readConcern: {level: "snapshot"},
  writeConcern: {w: "majority"},
  readPreference: "primary"
});
```

## 性能优化

### 查询优化

```javascript
// 使用explain()分析查询
db.users.find({age: {$gt: 25}}).explain("executionStats");

// 覆盖查询（只查询索引中的字段）
db.users.find({status: "active"}, {name: 1, status: 1, _id: 0});

// 使用投影减少数据传输
db.users.find({}, {name: 1, email: 1, _id: 0});

// 使用limit()限制结果集
db.users.find().limit(10);

// 使用游标分页（避免使用skip()）
let lastId = null;
if (lastId) {
  db.users.find({_id: {$gt: lastId}}).sort({_id: 1}).limit(10);
} else {
  db.users.find().sort({_id: 1}).limit(10);
}
```

### 批量操作

```javascript
// 批量插入
db.users.insertMany([
  {name: "User1", age: 25},
  {name: "User2", age: 30},
  {name: "User3", age: 35}
]);

// 批量更新
db.users.updateMany(
  {status: "inactive"},
  {$set: {status: "active"}}
);

// 有序批量操作
var bulk = db.users.initializeOrderedBulkOp();
bulk.insert({name: "User4", age: 40});
bulk.find({name: "User1"}).updateOne({$set: {age: 26}});
bulk.find({name: "User2"}).remove();
bulk.execute();

// 无序批量操作（并行执行，更快）
var bulk = db.users.initializeUnorderedBulkOp();
bulk.insert({name: "User5", age: 45});
bulk.find({name: "User3"}).updateOne({$set: {age: 36}});
bulk.find({name: "User4"}).remove();
bulk.execute();
```

## 数据建模

### 嵌入式模型

```javascript
// 一对一关系
db.users.insertOne({
  _id: ObjectId("user1"),
  name: "张三",
  address: {
    street: "中关村大街1号",
    city: "北京",
    zip: "100000"
  }
});

// 一对多关系
db.authors.insertOne({
  _id: ObjectId("author1"),
  name: "李四",
  books: [
    {title: "MongoDB入门", year: 2020, isbn: "1234567890"},
    {title: "NoSQL数据库", year: 2021, isbn: "0987654321"}
  ]
});
```

### 引用式模型

```javascript
// 一对多关系（使用引用）
db.authors.insertOne({
  _id: ObjectId("author2"),
  name: "王五"
});

db.books.insertMany([
  {
    title: "MongoDB高级",
    year: 2022,
    author_id: ObjectId("author2")
  },
  {
    title: "数据库设计",
    year: 2023,
    author_id: ObjectId("author2")
  }
]);

// 多对多关系
db.students.insertOne({
  _id: ObjectId("student1"),
  name: "赵六"
});

db.courses.insertMany([
  {_id: ObjectId("course1"), name: "数据库"},
  {_id: ObjectId("course2"), name: "编程"}
]);

db.enrollments.insertMany([
  {
    student_id: ObjectId("student1"),
    course_id: ObjectId("course1"),
    grade: "A"
  },
  {
    student_id: ObjectId("student1"),
    course_id: ObjectId("course2"),
    grade: "B"
  }
]);
```

### 模式验证

```javascript
// 创建集合时指定验证规则
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120,
          description: "must be an integer in [0, 120]"
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "must be an array of strings"
        }
      }
    }
  }
});

// 添加验证规则到现有集合
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "must be a valid email address"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120,
          description: "must be an integer in [0, 120]"
        }
      }
    }
  },
  validationLevel: "moderate",  // "strict" | "moderate" | "off"
  validationAction: "error"     // "error" | "warn"
});
```

## 安全与权限

### 用户管理

```javascript
// 创建管理员用户
use admin;
db.createUser({
  user: "admin",
  pwd: "admin_password",
  roles: [
    {role: "userAdminAnyDatabase", db: "admin"},
    {role: "dbAdminAnyDatabase", db: "admin"},
    {role: "readWriteAnyDatabase", db: "admin"}
  ]
});

// 创建应用用户
use myapp;
db.createUser({
  user: "app_user",
  pwd: "app_password",
  roles: [
    {role: "readWrite", db: "myapp"}
  ]
});

// 查看用户
use admin;
db.getUsers();

// 修改用户密码
db.updateUser("app_user", {pwd: "new_password"});

// 删除用户
db.dropUser("app_user");
```

### 角色管理

```javascript
// 创建自定义角色
db.createRole({
  role: "app_readonly",
  privileges: [
    {
      resource: {db: "myapp", collection: ""},
      actions: ["find"]
    }
  ],
  roles: []
});

// 授予角色
db.grantRolesToUser("app_user", ["app_readonly"]);

// 撤销角色
db.revokeRolesFromUser("app_user", ["app_readonly"]);

// 查看角色
db.getRoles();
```

### 访问控制

```javascript
// 启用认证
// 在mongod.conf中添加：
// security:
//   authorization: enabled

// 连接认证
mongo -u app_user -p app_password --authenticationDatabase myapp

// 在Mongo Shell中认证
use myapp;
db.auth("app_user", "app_password");
```

## 备份与恢复

### 数据备份

```javascript
// 使用mongodump备份整个数据库
mongodump --db mydb --out /backup/mongodb

// 备份指定集合
mongodump --db mydb --collection users --out /backup/mongodb

// 带认证的备份
mongodump --host localhost:27017 --username admin --password admin_password --authenticationDatabase admin --db mydb --out /backup/mongodb
```

### 数据恢复

```javascript
// 恢复整个数据库
mongorestore --db mydb /backup/mongodb/mydb

// 恢复指定集合
mongorestore --db mydb --collection users /backup/mongodb/mydb/users.bson

// 带认证的恢复
mongorestore --host localhost:27017 --username admin --password admin_password --authenticationDatabase admin --db mydb /backup/mongodb/mydb
```

## 常用工具与命令

### 监控与诊断

```javascript
// 查看服务器状态
db.serverStatus();

// 查看数据库状态
db.stats();

// 查看集合状态
db.users.stats();

// 查看当前操作
db.currentOp();

// 终止操作
db.killOp(opId);

// 查看慢查询
db.getProfilingStatus();
db.system.profile.find().sort({ts: -1}).limit(5);

// 设置慢查询阈值
db.setProfilingLevel(1, {slowms: 100});
```

### 性能调优

```javascript
// 查看执行计划
db.users.find({age: {$gt: 25}}).explain("executionStats");

// 查看索引使用情况
db.users.aggregate([{$indexStats: {}}]);

// 查看集合的存储信息
db.users.storageSize();
db.users.totalSize();
db.users.avgObjSize();
```

### 系统管理

```javascript
// 查看数据库版本
db.version();

// 查看服务器信息
db.serverStatus().host;

// 查看连接信息
db.serverStatus().connections;

// 查看内存使用情况
db.serverStatus().mem;

// 查看锁信息
db.serverStatus().locks;
```

## 最佳实践

### 查询优化

1. **合理使用索引**
   - 为经常用于查询条件的字段创建索引
   - 为经常用于排序和分组的字段创建索引
   - 避免过度索引，因为索引会降低写操作性能

2. **避免全集合扫描**
   - 使用查询条件限制返回的文档数
   - 避免在索引字段上使用复杂表达式
   - 注意类型匹配对索引的影响

3. **优化查询语句**
   - 只查询需要的字段，避免使用无限制的find()
   - 使用limit()限制结果集大小
   - 使用投影减少数据传输

### 数据建模

1. **选择合适的数据模型**
   - 一对一关系：使用嵌入式模型
   - 一对多关系：根据数据访问模式选择嵌入式或引用式
   - 多对多关系：使用引用式模型

2. **文档设计原则**
   - 将经常一起访问的数据放在同一个文档中
   - 避免文档过大（通常不超过16MB）
   - 合理设计数组结构，避免数组过大

3. **索引策略**
   - 为常用查询创建合适的索引
   - 使用复合索引优化多字段查询
   - 定期分析索引使用情况，删除无用索引

### 性能优化

1. **批量操作**
   - 使用insertMany()进行批量插入
   - 使用updateMany()进行批量更新
   - 使用Bulk操作进行大量数据操作

2. **分页查询**
   - 使用游标分页代替skip()和limit()
   - 对于大数据集，考虑使用范围查询

3. **聚合优化**
   - 在聚合管道早期使用$match减少数据量
   - 合理使用索引覆盖查询
   - 考虑使用$facet并行处理多个聚合

### 安全实践

1. **访问控制**
   - 启用认证和授权
   - 为不同应用创建不同的用户和角色
   - 遵循最小权限原则

2. **网络安全**
   - 使用防火墙限制访问
   - 启用SSL/TLS加密
   - 定期更新MongoDB版本

3. **数据加密**
   - 启用存储引擎加密
   - 对敏感数据进行应用层加密
   - 使用TLS加密网络传输

### 运维管理

1. **备份策略**
   - 定期进行全量备份和增量备份
   - 验证备份的完整性
   - 测试恢复流程

2. **监控告警**
   - 监控数据库性能指标
   - 设置合理的告警阈值
   - 定期检查慢查询日志

3. **容量规划**
   - 监控数据增长趋势
   - 提前规划存储容量
   - 考虑分片策略应对数据增长