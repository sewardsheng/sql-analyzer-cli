-- Redis查询测试
EVAL "local keys = redis.call('keys', 'user:*')
local results = {}
for i=1,#keys,5000 do
    local batch = {}
    for j=i,math.min(i+4999,#keys) do
        table.insert(batch, keys[j])
    end
    local values = redis.call('mget', unpack(batch))
    for k=1,#batch do
        if values[k] then
            table.insert(results, batch[k])
            table.insert(results, values[k])
        end
    end
end
return results" 0