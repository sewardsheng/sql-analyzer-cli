-- MongoDB聚合查询测试
db.users.aggregate([
  {
    $lookup: {
      from: "posts",
      localField: "_id",
      foreignField: "user_id",
      as: "posts"
    }
  },
  {
    $match: {
      created_at: { $gt: ISODate("2023-01-01") }
    }
  },
  {
    $unwind: "$posts"
  },
  {
    $project: {
      id: "$_id",
      name: 1,
      title: "$posts.title"
    }
  },
  {
    $sort: {
      "posts.created_at": -1
    }
  },
  {
    $limit: 10
  }
])